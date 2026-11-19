"""Development container broker; not yet a native-host isolation harness.

Trusted orchestration owns configuration and supplies only synthetic input/skill
directories. Callers must add crash watchdog and host tool inventory enforcement.
"""
import json
import math
import os
from pathlib import Path
import re
import selectors
import shutil
import signal
import subprocess
import threading
import time
import uuid

from artifact_export import export_archive


class ProcessLimit(RuntimeError):
    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


def bounded_process(argv, *, seconds, max_bytes, env=None):
    """Bound combined stdout/stderr and wall time, including inherited pipes."""
    if (not isinstance(seconds, (int, float)) or not math.isfinite(seconds)
            or seconds <= 0 or type(max_bytes) is not int or max_bytes < 0):
        raise ValueError("Invalid process limits")
    deadline = time.monotonic() + seconds
    process = subprocess.Popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, start_new_session=True, env=env)
    output = [bytearray(), bytearray()]
    total = 0
    try:
        with selectors.DefaultSelector() as selector:
            for index, stream in enumerate((process.stdout, process.stderr)):
                os.set_blocking(stream.fileno(), False)
                selector.register(stream, selectors.EVENT_READ, index)
            while selector.get_map() or process.poll() is None:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise ProcessLimit("timeout")
                for key, _ in selector.select(min(remaining, .05)):
                    chunk = os.read(key.fileobj.fileno(), min(65536, max_bytes - total + 1))
                    if not chunk:
                        selector.unregister(key.fileobj)
                        continue
                    total += len(chunk)
                    if total > max_bytes:
                        raise ProcessLimit("output-limit")
                    output[key.data].extend(chunk)
            return process.returncode, bytes(output[0]), bytes(output[1])
    finally:
        # Kill descendants even if their parent exited and pipes are closed.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)
        process.stdout.close()
        process.stderr.close()


class ContainerBroker:
    def __init__(self, *, endpoint, image, platform, command_seconds=30,
                 session_seconds=300, output_bytes=1024 * 1024):
        if not endpoint.startswith("unix:///"):
            raise ValueError("Only explicitly selected local Unix endpoints are supported")
        if not re.fullmatch(r"[a-zA-Z0-9./_-]+@sha256:[0-9a-f]{64}", image):
            raise ValueError("A pinned image digest is required")
        if platform not in ("linux/amd64", "linux/arm64"):
            raise ValueError("Explicit supported platform required")
        if any(type(n) not in (int, float) or not math.isfinite(n) or n <= 0
               for n in (command_seconds, session_seconds)):
            raise ValueError("Invalid deadlines")
        if type(output_bytes) is not int or output_bytes <= 0:
            raise ValueError("Invalid output budget")
        self.docker = shutil.which("docker")
        if not self.docker:
            raise RuntimeError("Docker client unavailable")
        self.endpoint, self.image, self.platform = endpoint, image, platform
        self.name = "nk-audit-broker-" + uuid.uuid4().hex
        self.command_seconds = command_seconds
        self.deadline = time.monotonic() + session_seconds
        self.remaining_output = output_bytes
        self.state = "new"
        self.lock = threading.Lock()
        self.receipt = {"name": self.name, "image": image, "platform": platform,
                        "isolationVerified": False, "commands": []}

    def _docker(self, args, *, seconds=20, max_bytes=1024 * 1024):
        return bounded_process([self.docker, "--host", self.endpoint, *args],
            seconds=seconds, max_bytes=max_bytes,
            env={"PATH": os.defpath, "HOME": "/nonexistent"})

    def _checked(self, args, **kwargs):
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise ProcessLimit("session-limit")
        kwargs["seconds"] = min(kwargs.get("seconds", 20), remaining)
        code, stdout, stderr = self._docker(args, **kwargs)
        if code:
            raise RuntimeError("Docker operation failed: " + stderr.decode(errors="replace")[:1000])
        return stdout

    def start(self, inputs, skill):
        with self.lock:
            if self.state != "new":
                raise RuntimeError("Broker already started or closed")
            paths = [Path(p).resolve(strict=True) for p in (inputs, skill)]
            if any(not p.is_dir() or ',' in str(p) for p in paths):
                raise ValueError("Invalid input/skill mount")
            try:
                image_info = json.loads(self._checked(["image", "inspect", self.image]))[0]
                if image_info.get("Os", "") + "/" + image_info.get("Architecture", "") != self.platform:
                    raise RuntimeError("Image platform differs")
                self._checked(["run", "-d", "--name", self.name, "--pull", "never",
                    "--platform", self.platform, "--label", "nkskills.evaluation=" + self.name,
                    "--network", "none", "--read-only", "--cap-drop", "ALL",
                    "--security-opt", "no-new-privileges", "--memory", "256m",
                    "--memory-swap", "256m", "--cpus", "1", "--pids-limit", "64",
                    "--ulimit", "nofile=256:256", "--shm-size", "16m", "--ipc", "private",
                    "--user", "1000:1000", "--log-driver", "none", "--workdir", "/work",
                    "--env", "HOME=/work", "--tmpfs", "/work:rw,noexec,nosuid,nodev,size=32m,uid=1000,gid=1000",
                    "--tmpfs", "/tmp:rw,noexec,nosuid,nodev,size=16m,uid=1000,gid=1000",
                    "--mount", f"type=bind,src={paths[0]},dst=/inputs,readonly",
                    "--mount", f"type=bind,src={paths[1]},dst=/skill,readonly",
                    self.image, "node", "-e", "setInterval(()=>{},1000)"])
                inspected = json.loads(self._checked(["inspect", self.name]))[0]
                self.receipt["effectiveContainer"] = inspected
                host, config = inspected["HostConfig"], inspected["Config"]
                self._verify_additional_settings(inspected, image_info)
                required = {"NetworkMode": "none", "ReadonlyRootfs": True,
                            "Memory": 256*1024*1024, "MemorySwap": 256*1024*1024,
                            "PidsLimit": 64, "NanoCpus": 1000000000, "Privileged": False}
                if any(host.get(k) != v for k, v in required.items()):
                    raise RuntimeError("Effective resource/isolation settings differ")
                if (config.get("User") != "1000:1000" or host.get("CapDrop") != ["ALL"]
                        or "no-new-privileges" not in host.get("SecurityOpt", [])
                        or host.get("PidMode", "") not in ("", "private")
                        or host.get("Devices") or host.get("CapAdd")):
                    raise RuntimeError("Effective privilege settings differ")
                mounts = inspected.get("Mounts", [])
                binds = [m for m in mounts if m.get("Type") == "bind"]
                expected = {(str(paths[0]), "/inputs"), (str(paths[1]), "/skill")}
                if (len(binds) != 2 or {(m.get("Source"), m.get("Destination")) for m in binds} != expected
                        or any(m.get("RW") is not False for m in binds)
                        or any(m.get("Type") not in ("bind", "tmpfs") for m in mounts)):
                    raise RuntimeError("Effective mounts differ")
                self.state = "running"
            except BaseException:
                self._abort()
                raise

    def _verify_additional_settings(self, inspected, image_info):
        host = inspected["HostConfig"]
        expected_tmpfs = {
            "/work": {"rw", "noexec", "nosuid", "nodev", "size=32m", "uid=1000", "gid=1000"},
            "/tmp": {"rw", "noexec", "nosuid", "nodev", "size=16m", "uid=1000", "gid=1000"},
        }
        actual = host.get("Tmpfs")
        if (not isinstance(actual, dict) or set(actual) != set(expected_tmpfs)
                or any(not isinstance(actual[k], str) or set(actual[k].split(",")) != v
                       for k, v in expected_tmpfs.items())):
            raise RuntimeError("Effective tmpfs settings differ or are unavailable")
        if (host.get("ShmSize") != 16*1024*1024 or host.get("IpcMode") != "private"
                or host.get("Ulimits") != [{"Name": "nofile", "Soft": 256, "Hard": 256}]
                or host.get("LogConfig", {}).get("Type") != "none"
                or inspected.get("Image") != image_info.get("Id")
                or not image_info.get("Id") or inspected.get("State", {}).get("Running") is not True
                or inspected.get("Config", {}).get("Image") != self.image):
            raise RuntimeError("Effective runtime/image settings differ or are unavailable")
        tmpfs = [m for m in inspected.get("Mounts", []) if m.get("Type") == "tmpfs"]
        if len(tmpfs) != 2 or {m.get("Destination") for m in tmpfs} != set(expected_tmpfs):
            raise RuntimeError("Effective tmpfs mount inventory differs")

    def _abort(self):
        self.state = "aborted"
        try:
            code, _, _ = self._docker(["rm", "-f", self.name])
            if code:
                raise RuntimeError("Container removal failed")
            # A successful empty listing verifies absence without interpreting an
            # inspect error (which could also mean daemon failure) as cleanup.
            code, remaining, _ = self._docker(["ps", "-aq", "--filter", "name=^/" + self.name + "$"])
            self.receipt["cleanupVerified"] = code == 0 and not remaining.strip()
        except Exception:
            self.receipt["cleanupVerified"] = False

    def execute(self, command):
        with self.lock:
            if self.state != "running":
                raise RuntimeError("Broker is not accepting commands")
            if not isinstance(command, str) or not command or len(command.encode()) > 65536 or '\0' in command:
                raise ValueError("Invalid command")
            remaining = self.deadline - time.monotonic()
            try:
                if remaining <= 0 or self.remaining_output <= 0:
                    raise ProcessLimit("session-limit")
                result = self._docker(["exec", "--workdir", "/work", self.name, "sh", "-c", command],
                    seconds=min(remaining, self.command_seconds), max_bytes=self.remaining_output)
                self.remaining_output -= len(result[1]) + len(result[2])
                self.receipt["commands"].append({"exitCode": result[0], "outputBytes": len(result[1])+len(result[2])})
                return result
            except BaseException:
                self._abort()
                raise

    def export(self, destination):
        with self.lock:
            if self.state != "running":
                raise RuntimeError("Cannot export an inactive workload")
            self.state = "freezing"
            try:
                self._checked(["pause", self.name])
                state = json.loads(self._checked(["inspect", "--format", "{{json .State}}", self.name]))
                if state.get("Paused") is not True:
                    raise RuntimeError("Workload was not frozen")
                data = self._checked(["cp", self.name + ":/work/.", "-"], max_bytes=32*1024*1024)
                records = export_archive(data, destination)
                self.receipt["artifacts"] = records
                return records
            finally:
                self._abort()
                if not self.receipt.get("cleanupVerified"):
                    raise RuntimeError("Artifact publication is not accepted: container cleanup unverified")

    def close(self):
        with self.lock:
            self._abort()
