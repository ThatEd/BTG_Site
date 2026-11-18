#!/usr/bin/env python3
"""Build the BTG live radio paks for F1 Manager 24.

  python game-mod/build.py              one pak per series (F1, F2, XGT)
  python game-mod/build.py F1 F2        only these series
  python game-mod/build.py --local      test pak that talks to `node server.js`
                                        on this PC (series F1, status line on)

Paks are written to game-mod/dist/. Plain Python 3, nothing to install.
The pak format is Unreal pak version 3, mount point ../../../, uncompressed.
"""
import hashlib, json, os, shutil, struct, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
DIST = os.path.join(HERE, "dist")
CONFIG_PATH = ("F1Manager24/Content/UIGameface/js/project/modules/raceWeekend/"
               "driverPanel/teamComms/BtgRadioConfig.js")

DEFAULT_SERIES = ["F1", "F2", "XGT"]
SUPABASE_URL = "https://jocmjietuviegelluiev.supabase.co"
SITE_BASE = "https://thated.github.io/BTG_Site/"
LOCAL_BASE = "http://127.0.0.1:8080/"


def anon_key():
    """The public (anon) key, read from scripts/build-db-cache.js."""
    import re
    path = os.path.join(HERE, "..", "scripts", "build-db-cache.js")
    text = open(path, encoding="utf-8").read()
    m = re.search(r"SUPABASE_ANON_KEY\s*\|\|\s*['\"]([^'\"]+)['\"]", text)
    if not m:
        sys.exit("Could not find the anon key in scripts/build-db-cache.js")
    return m.group(1)


def config_js(cfg):
    return (
        "/* Written by game-mod/build.py. Do not edit by hand. */\n"
        'define(["require", "exports"], function (require, exports) {\n'
        '    "use strict";\n'
        '    Object.defineProperty(exports, "__esModule", { value: true });\n'
        "    exports.BtgRadioConfig = " + json.dumps(cfg) + ";\n"
        "});\n"
    )


def write_pak(root, out):
    files = []
    for dp, _, fs in os.walk(root):
        for n in fs:
            full = os.path.join(dp, n)
            with open(full, "rb") as fh:
                files.append((os.path.relpath(full, root).replace(os.sep, "/"), fh.read()))
    files.sort()

    def rec(off, data):
        return (struct.pack("<QQQI", off, len(data), len(data), 0)
                + hashlib.sha1(data).digest() + b"\x00" + struct.pack("<I", 0))

    def fstr(s):
        b = s.encode() + b"\x00"
        return struct.pack("<i", len(b)) + b

    body = b""
    idx = fstr("../../../") + struct.pack("<I", len(files))
    for name, data in files:
        off = len(body)
        body += rec(0, data) + data
        idx += fstr(name) + rec(off, data)
    foot = struct.pack("<IIQQ", 0x5A6F12E1, 3, len(body), len(idx)) + hashlib.sha1(idx).digest()
    with open(out, "wb") as fh:
        fh.write(body + idx + foot)
    return len(files)


def build(name, cfg):
    os.makedirs(DIST, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        shutil.copytree(os.path.join(SRC, "F1Manager24"), os.path.join(tmp, "F1Manager24"))
        with open(os.path.join(tmp, CONFIG_PATH), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(config_js(cfg))
        out = os.path.join(DIST, name)
        count = write_pak(tmp, out)
    print(f"{out}  ({count} files, series {cfg['series']})")


def main():
    args = sys.argv[1:]
    if "--local" in args:
        build("BTG Radio LOCALTEST_P.pak", {
            "series": "F1",
            "pollUrl": LOCAL_BASE + "api/radio-poll",
            "apiKey": "",
            "siteBase": LOCAL_BASE,
            "debug": True,
        })
        return
    key = anon_key()
    for series in (args or DEFAULT_SERIES):
        series = series.strip().upper()
        series = "XGT" if series == "GT1" else series
        build(f"BTG Radio {series}_P.pak", {
            "series": series,
            "pollUrl": SUPABASE_URL + "/rest/v1/rpc/radio_poll",
            "apiKey": key,
            "siteBase": SITE_BASE,
            "debug": False,
        })


if __name__ == "__main__":
    main()
