"""Supplemental evaluation of Linux kernel snapshots; never an isolation gate.

The caller must establish acquisition authenticity, freshness and container/image
identity. This parser cannot do so and never overrides the broker's inspect gate.
"""
import re


def text(snapshot, path):
    value = snapshot.get(path)
    if not isinstance(value, str) or len(value) > 1024*1024:
        raise ValueError("Missing or unsupported source")
    return value.strip()


def field(snapshot, key):
    values = [line.split(":", 1)[1].strip() for line in text(snapshot, "/proc/self/status").splitlines()
              if line.startswith(key + ":")]
    if len(values) != 1:
        raise ValueError("Missing or ambiguous status field")
    return values[0]


def mount(snapshot, target):
    candidates = []
    for line in text(snapshot, "/proc/self/mountinfo").splitlines():
        parts = line.split(" - ")
        if len(parts) != 2:
            raise ValueError("Malformed mount record")
        before, after = parts[0].split(), parts[1].split()
        if len(before) < 6 or len(after) != 3:
            raise ValueError("Malformed mount fields")
        if before[4] == target:
            candidates.append((set(before[5].split(",")), after[0], after[2].split(",")))
    if len(candidates) != 1:
        raise ValueError("Missing or stacked mount")
    return candidates[0]


def option(options, key):
    values = [value.split("=", 1)[1] for value in options if value.startswith(key + "=")]
    if len(values) != 1:
        raise ValueError("Missing or ambiguous mount option")
    return values[0]


def size(value):
    match = re.fullmatch(r"([0-9]+)([kmg]?)", value.lower())
    if not match:
        raise ValueError("Unsupported size")
    return int(match[1]) * {"": 1, "k": 1024, "m": 1024**2, "g": 1024**3}[match[2]]


def tmpfs(snapshot, path, expected, owner=False):
    flags, filesystem, options = mount(snapshot, path)
    matches = (filesystem == "tmpfs" and {"rw", "nosuid", "nodev", "noexec"} <= flags
               and not {"ro", "suid", "dev", "exec"} & flags and size(option(options, "size")) == expected)
    if owner:
        matches = matches and option(options, "uid") == "1000" and option(options, "gid") == "1000"
    return matches


def cpu(snapshot):
    fields = text(snapshot, "/sys/fs/cgroup/cpu.max").split()
    if len(fields) != 2 or not fields[1].isdigit() or int(fields[1]) <= 0:
        raise ValueError("Malformed CPU quota")
    if fields[0] == "max":
        return False
    if not fields[0].isdigit():
        raise ValueError("Malformed CPU quota")
    return int(fields[0]) == int(fields[1])


def capabilities(snapshot):
    values = [field(snapshot, key) for key in ("CapInh", "CapPrm", "CapEff", "CapBnd", "CapAmb")]
    if any(not re.fullmatch("[0-9a-fA-F]{16}", value) for value in values):
        raise ValueError("Malformed capability mask")
    return all(int(value, 16) == 0 for value in values)


def files(snapshot):
    matches = re.findall(r"^Max open files\s+(\S+)\s+(\S+)\s+files\s*$",
                         text(snapshot, "/proc/self/limits"), flags=re.MULTILINE)
    if len(matches) != 1:
        raise ValueError("Missing or ambiguous file limit")
    return matches[0] == ("256", "256")


def root_readonly(snapshot):
    flags, _, _ = mount(snapshot, "/")
    return "ro" in flags and "rw" not in flags


def evaluate(snapshot):
    if not isinstance(snapshot, dict):
        raise ValueError("Snapshot must be an object")
    rules = [
        ("memory_limit", "/sys/fs/cgroup/memory.max", lambda: text(snapshot, "/sys/fs/cgroup/memory.max") == "268435456"),
        ("swap_limit", "/sys/fs/cgroup/memory.swap.max", lambda: text(snapshot, "/sys/fs/cgroup/memory.swap.max") == "0"),
        ("pid_limit", "/sys/fs/cgroup/pids.max", lambda: text(snapshot, "/sys/fs/cgroup/pids.max") == "64"),
        ("cpu_limit", "/sys/fs/cgroup/cpu.max", lambda: cpu(snapshot)),
        ("nonroot", "/proc/self/status", lambda: all(field(snapshot, key).split() == ["1000"]*4 for key in ("Uid", "Gid"))),
        ("capabilities", "/proc/self/status", lambda: capabilities(snapshot)),
        ("no_new_privileges", "/proc/self/status", lambda: field(snapshot, "NoNewPrivs") == "1"),
        ("seccomp_filter_active", "/proc/self/status", lambda: field(snapshot, "Seccomp") == "2"),
        ("root_readonly", "/proc/self/mountinfo", lambda: root_readonly(snapshot)),
        ("work_tmpfs", "/proc/self/mountinfo", lambda: tmpfs(snapshot, "/work", 32*1024**2, True)),
        ("tmp_tmpfs", "/proc/self/mountinfo", lambda: tmpfs(snapshot, "/tmp", 16*1024**2, True)),
        ("shm_tmpfs", "/proc/self/mountinfo", lambda: tmpfs(snapshot, "/dev/shm", 16*1024**2)),
        ("fd_limit", "/proc/self/limits", lambda: files(snapshot)),
    ]
    checks = []
    for identifier, source, verify in rules:
        try:
            status, reason = ("pass", "Matches development policy") if verify() else ("fail", "Differs from development policy")
        except ValueError as error:
            status, reason = "unknown", str(error)
        checks.append({"id": identifier, "source": source, "status": status, "reason": reason})
    for identifier in ("namespace_separation", "network_isolation", "seccomp_policy_identity",
                       "input_mounts", "snapshot_authenticity", "host_tool_isolation", "image_identity"):
        checks.append({"id": identifier, "source": None, "status": "unknown",
                       "reason": "Not established by this snapshot evaluator"})
    return {"schemaVersion": 1, "scope": "supplemental kernel evidence",
            "isolationVerified": False, "brokerAdmissionAllowed": False, "checks": checks}
