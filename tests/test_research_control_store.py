import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

WORKER = Path(__file__).resolve().parents[1] / "scripts/enterprise-journeys/research_control_store.py"


class ResearchInitializationTests(unittest.TestCase):
    def test_crash_before_publication_leaves_target_available_for_retry(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory).resolve() / "store"
            request = {"operation": "create", "directory": str(target), "scope": "synthetic-scope", "expected": None, "envelope": "opaque-encrypted-fixture"}
            code = "import importlib.util,os,sys; spec=importlib.util.spec_from_file_location('store',sys.argv[1]); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); m.publish_exclusive=lambda *args: os._exit(73); m.main()"
            crashed = subprocess.run([sys.executable, "-I", "-c", code, str(WORKER)], input=json.dumps(request), text=True, capture_output=True)
            self.assertEqual(crashed.returncode, 73)
            self.assertFalse(target.exists())
            self.assertTrue(list(target.parent.glob(".research-control-init-*")))
            retried = subprocess.run([sys.executable, "-I", str(WORKER)], input=json.dumps(request), text=True, capture_output=True)
            self.assertEqual(retried.returncode, 0)
            self.assertEqual(json.loads(retried.stdout)["revision"], 1)

    def test_post_publication_sync_failure_reports_uncertain_commit(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory).resolve() / "store"
            request = {"operation": "create", "directory": str(target), "scope": "synthetic-scope", "expected": None, "envelope": "opaque-encrypted-fixture"}
            code = "import os,runpy,sys\nreal=os.fsync\ncount=0\ndef fail_parent(fd):\n global count\n count+=1\n if count==2: raise OSError('synthetic sync failure')\n return real(fd)\nos.fsync=fail_parent\nrunpy.run_path(sys.argv[1],run_name='__main__')"
            result = subprocess.run([sys.executable, "-I", "-c", code, str(WORKER)], input=json.dumps(request), text=True, capture_output=True)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(json.loads(result.stdout)["error"], "storage-outcome-unknown")
            self.assertTrue((target / "control.sqlite").exists())
            request.update(operation="read", envelope=None)
            read = subprocess.run([sys.executable, "-I", str(WORKER)], input=json.dumps(request), text=True, capture_output=True)
            self.assertEqual(read.returncode, 0)
            self.assertEqual(json.loads(read.stdout)["revision"], 1)

    def test_publication_never_replaces_preexisting_empty_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            source, target = root / "staged", root / "existing"
            source.mkdir(mode=0o700)
            target.mkdir(mode=0o700)
            original_inode = target.stat().st_ino
            code = "import importlib.util,sys,pathlib; s=importlib.util.spec_from_file_location('store',sys.argv[1]); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); m.publish_exclusive(pathlib.Path(sys.argv[2]),pathlib.Path(sys.argv[3]))"
            result = subprocess.run([sys.executable, "-I", "-c", code, str(WORKER), str(source), str(target)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(target.stat().st_ino, original_inode)
            self.assertTrue(source.exists())


if __name__ == "__main__":
    unittest.main()
