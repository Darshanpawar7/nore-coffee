"""Builds the site's font files. Run it again after changing the brand's Kannada words.

    python scripts/subset-fonts.py

The Fontsource packages split each family by script, and the browser fetches a whole file for a single
character from it: Rs (the rupee sign, U+20B9) alone pulled in 81 KB of extended Latin, and three Kannada
words pulled in 304 KB. This script keeps every variation axis and every layout feature, so condensed widths
and Kannada conjuncts still work, and writes:

    anek-latin-latin.woff2      the Latin file as published (the hero needs its width axis)
    anek-latin-symbols.woff2    only the rupee and minus signs
    anek-kannada-words.woff2    only the glyphs of the brand's three Kannada words, at the one width the
                                identity sets them in (90%) and weights 500 to 700
    newsreader-latin.woff2      the weight-only Latin file (the optical-size axis is not used)
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
FONTSOURCE = ROOT / "node_modules" / "@fontsource-variable"
OUT = ROOT / "src" / "fonts"


def kannada_words() -> str:
    """The brand's Kannada words, read from src/brand/kannada.ts so the two can never disagree."""
    source = (ROOT / "src" / "brand" / "kannada.ts").read_text(encoding="utf-8")
    return "".join(ch for ch in source if "\u0c80" <= ch <= "\u0cff")


def cut(source: Path, target: Path, text: str = "", unicodes: str = "") -> None:
    options = subset.Options()
    options.layout_features = ["*"]
    options.flavor = "woff2"
    options.name_IDs = ["*"]
    options.notdef_outline = True
    font = subset.load_font(str(source), options)
    subsetter = subset.Subsetter(options)
    codepoints = [int(part, 16) for part in unicodes.split(",") if part]
    subsetter.populate(text=text, unicodes=codepoints)
    subsetter.subset(font)
    subset.save_font(font, str(target), options)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(FONTSOURCE / "anek-latin" / "files" / "anek-latin-latin-standard-normal.woff2", OUT / "anek-latin-latin.woff2")
    cut(FONTSOURCE / "anek-latin" / "files" / "anek-latin-latin-ext-standard-normal.woff2", OUT / "anek-latin-symbols.woff2", unicodes="20B9,2212")
    words = kannada_words()
    kannada = OUT / "anek-kannada-words.woff2"
    cut(FONTSOURCE / "anek-kannada" / "files" / "anek-kannada-kannada-standard-normal.woff2", kannada, text=words + " ")
    # The identity sets Kannada at one width, so that axis can be pinned: 40 KB becomes about 10.
    font = TTFont(str(kannada))
    pinned = instancer.instantiateVariableFont(font, {"wdth": 90, "wght": (500, 700)})
    pinned.flavor = "woff2"
    pinned.save(str(kannada))
    shutil.copyfile(FONTSOURCE / "newsreader" / "files" / "newsreader-latin-wght-normal.woff2", OUT / "newsreader-latin.woff2")
    sizes = {path.name: path.stat().st_size for path in sorted(OUT.glob("*.woff2"))}
    print(json.dumps(sizes, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
