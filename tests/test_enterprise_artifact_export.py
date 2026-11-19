"""Adversarial cases for untrusted evaluation artifacts (no Docker required)."""
import importlib.util
import io
import os
from pathlib import Path
import tarfile
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1] / "scripts/enterprise-evaluation/artifact_export.py"
spec = importlib.util.spec_from_file_location("artifact_export", MODULE)
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


def archive(entries):
    data = io.BytesIO()
    with tarfile.open(fileobj=data, mode="w", format=tarfile.USTAR_FORMAT) as tar:
        for name, kind, payload in entries:
            info = tarfile.TarInfo(name)
            info.type = kind
            if kind == tarfile.REGTYPE:
                info.size = len(payload)
            else:
                info.linkname = payload.decode()
            tar.addfile(info, io.BytesIO(payload) if kind == tarfile.REGTYPE else None)
    return data.getvalue()


class ArtifactExportTest(unittest.TestCase):
    def test_intermediate_directories_are_private_with_permissive_umask(self):
        with tempfile.TemporaryDirectory() as root:
            previous = os.umask(0)
            try:
                out = Path(root) / "output"
                exporter.export_archive(archive([("work/a/b/file", tarfile.REGTYPE, b"x")]), out)
                self.assertEqual((out / "a").stat().st_mode & 0o777, 0o700)
            finally:
                os.umask(previous)

    def test_gnu_extension_headers_are_rejected(self):
        data = io.BytesIO()
        with tarfile.open(fileobj=data, mode="w", format=tarfile.GNU_FORMAT) as tar:
            info = tarfile.TarInfo("work/" + "a" * 120)
            tar.addfile(info, io.BytesIO())
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaises(ValueError):
                exporter.export_archive(data.getvalue(), Path(root) / "output")

    def test_regular_files_have_fixed_modes_and_hashes(self):
        with tempfile.TemporaryDirectory() as root:
            out = Path(root) / "output"
            result = exporter.export_archive(archive([
                ("work", tarfile.DIRTYPE, b""),
                ("work/report.json", tarfile.REGTYPE, b"{}"),
            ]), out)
            self.assertEqual((out / "report.json").read_bytes(), b"{}")
            self.assertEqual((out / "report.json").stat().st_mode & 0o777, 0o600)
            self.assertEqual(result[0]["sha256"], "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a")

    def test_unsafe_members_fail_without_publishing(self):
        cases = [
            [("work/../escape", tarfile.REGTYPE, b"x")],
            [("/work/absolute", tarfile.REGTYPE, b"x")],
            [("work/link", tarfile.SYMTYPE, b"/tmp")],
            [("work/link", tarfile.LNKTYPE, b"work/file")],
            [("work/pipe", tarfile.FIFOTYPE, b"")],
            [("work/a", tarfile.REGTYPE, b"x"), ("work/a", tarfile.REGTYPE, b"y")],
            [("work/a", tarfile.REGTYPE, b"x"), ("work/a/b", tarfile.REGTYPE, b"y")],
            [("other/file", tarfile.REGTYPE, b"x")],
            [("work/a\\b", tarfile.REGTYPE, b"x")],
        ]
        for entries in cases:
            with self.subTest(entries=entries), tempfile.TemporaryDirectory() as root:
                out = Path(root) / "output"
                with self.assertRaises(ValueError):
                    exporter.export_archive(archive(entries), out)
                self.assertFalse(out.exists())

    def test_limits_and_existing_destination(self):
        data = archive([("work/a", tarfile.REGTYPE, b"abc")])
        for limits in ({"max_archive_bytes": 1}, {"max_expanded_bytes": 2}, {"max_entries": 0}):
            with tempfile.TemporaryDirectory() as root:
                out = Path(root) / "output"
                with self.assertRaises(ValueError):
                    exporter.export_archive(data, out, **limits)
                self.assertFalse(out.exists())
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaises(FileExistsError):
                exporter.export_archive(data, Path(root))


if __name__ == "__main__":
    unittest.main()
