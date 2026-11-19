"""Kernel evidence is supplemental; even a matching snapshot cannot pass isolation."""
import copy
import importlib.util
import json
import re
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("kernel_evidence", ROOT / "scripts/enterprise-evaluation/kernel_evidence.py")
kernel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kernel)


class KernelEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = json.loads((ROOT / "tests/fixtures/enterprise-evaluation/kernel-snapshot.json").read_text())["kernel"]

    def checks(self, snapshot):
        result = kernel.evaluate(snapshot)
        self.assertIs(result["isolationVerified"], False)
        self.assertIs(result["brokerAdmissionAllowed"], False)
        return {check["id"]: check for check in result["checks"]}

    def test_real_capture_supports_selected_checks_only(self):
        checks = self.checks(self.snapshot)
        self.assertEqual(sum(c["status"] == "pass" for c in checks.values()), 13)
        self.assertEqual(checks["namespace_separation"]["status"], "unknown")
        self.assertEqual(checks["seccomp_policy_identity"]["status"], "unknown")

    def test_unlimited_or_wrong_cgroup_values_fail(self):
        for name, value, identifier in [
            ("memory.max", "max", "memory_limit"),
            ("memory.swap.max", "1", "swap_limit"),
            ("pids.max", "max", "pid_limit"),
            ("cpu.max", "200000 100000", "cpu_limit"),
        ]:
            changed = copy.deepcopy(self.snapshot)
            changed["/sys/fs/cgroup/"+name] = value
            with self.subTest(name=name):
                self.assertEqual(self.checks(changed)[identifier]["status"], "fail")

    def test_missing_evidence_never_passes(self):
        self.assertTrue(all(c["status"] == "unknown" for c in self.checks({}).values()))

    def test_mount_flags_and_sizes_are_not_inferred_from_superblock(self):
        changed = copy.deepcopy(self.snapshot)
        changed["/proc/self/mountinfo"] = changed["/proc/self/mountinfo"].replace("/ / ro,relatime", "/ / rw,relatime")
        self.assertEqual(self.checks(changed)["root_readonly"]["status"], "fail")
        changed = copy.deepcopy(self.snapshot)
        changed["/proc/self/mountinfo"] = changed["/proc/self/mountinfo"].replace("size=32768k", "size=65536k")
        self.assertEqual(self.checks(changed)["work_tmpfs"]["status"], "fail")

    def test_duplicate_mounts_or_status_fields_stay_unknown(self):
        changed = copy.deepcopy(self.snapshot)
        changed["/proc/self/mountinfo"] += next(x for x in changed["/proc/self/mountinfo"].splitlines() if x.split()[4] == '/work')+'\n'
        self.assertEqual(self.checks(changed)["work_tmpfs"]["status"], "unknown")
        changed = copy.deepcopy(self.snapshot)
        changed["/proc/self/status"] += "NoNewPrivs:\t1\n"
        self.assertEqual(self.checks(changed)["no_new_privileges"]["status"], "unknown")

    def test_privilege_mutations_fail(self):
        for old, new, identifier in [
            ("NoNewPrivs:\t1", "NoNewPrivs:\t0", "no_new_privileges"),
            ("Seccomp:\t2", "Seccomp:\t0", "seccomp_filter_active"),
            ("CapEff:\t0000000000000000", "CapEff:\t0000000000000001", "capabilities"),
        ]:
            changed = copy.deepcopy(self.snapshot)
            self.assertIn(old, changed["/proc/self/status"])
            changed["/proc/self/status"] = changed["/proc/self/status"].replace(old, new)
            self.assertEqual(self.checks(changed)[identifier]["status"], "fail")

    def test_wrong_ids_tmpfs_ownership_and_security_flags_fail(self):
        for key in ("Uid", "Gid"):
            changed = copy.deepcopy(self.snapshot)
            changed["/proc/self/status"] = changed["/proc/self/status"].replace(key+":\t1000", key+":\t0")
            self.assertEqual(self.checks(changed)["nonroot"]["status"], "fail")
        for old, new in [("uid=1000", "uid=0"), ("gid=1000", "gid=0"),
                         ("noexec,", ""), ("nodev,", ""), ("nosuid,", "")]:
            changed = copy.deepcopy(self.snapshot)
            changed["/proc/self/mountinfo"] = changed["/proc/self/mountinfo"].replace(old, new)
            with self.subTest(option=old):
                self.assertEqual(self.checks(changed)["work_tmpfs"]["status"], "fail")

    def test_fd_mismatch_and_malformed_cpu_are_distinguished(self):
        changed = copy.deepcopy(self.snapshot)
        changed["/proc/self/limits"] = re.sub(r"(Max open files\s+)256", r"\g<1>512", changed["/proc/self/limits"])
        self.assertEqual(self.checks(changed)["fd_limit"]["status"], "fail")
        changed["/sys/fs/cgroup/cpu.max"] = "invalid 100000"
        self.assertEqual(self.checks(changed)["cpu_limit"]["status"], "unknown")


if __name__ == "__main__":
    unittest.main()
