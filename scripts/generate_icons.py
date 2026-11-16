"""Génère les icônes de l'appli (PWA, favicon) à partir d'une petite citrouille en pixel art.

Usage : python3 scripts/generate_icons.py   (nécessite Pillow)
"""
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public"

# Même dessin que la citrouille du jeu (src/art/sprites.ts), sur fond d'herbe.
ART = [
    "................",
    "................",
    ".......kk.......",
    "......kak.......",
    "...kkkkakkkkk...",
    "..kffkfFfkfFFk..",
    ".kfwfFkfFFkFFRk.",
    ".kfwFFkFFFkFFRk.",
    ".kfFFFkFFRkFRRk.",
    ".kFFFRkFFRkFRRk.",
    ".kFFRRkFRRkRRRk.",
    "..kRRRkRRRkRRk..",
    "...kkkkkkkkkk...",
    "................",
    "................",
    "................",
]
PALETTE = {
    "k": (59, 42, 53),
    "f": (255, 176, 74),
    "F": (240, 122, 26),
    "R": (168, 74, 16),
    "a": (107, 143, 42),
    "w": (255, 250, 240),
}
GRASS = (124, 196, 90)
GRASS_DARK = (90, 163, 74)


def base(padding: int) -> Image.Image:
    size = 16 + 2 * padding
    img = Image.new("RGBA", (size, size), GRASS + (255,))
    px = img.load()
    # Un peu de texture d'herbe, déterministe.
    for i in range(size * 2):
        x, y = (i * 7 + 3) % size, (i * 11 + 5) % size
        px[x, y] = GRASS_DARK + (255,)
    for y, row in enumerate(ART):
        for x, c in enumerate(row):
            if c in PALETTE:
                px[x + padding, y + padding + 1] = PALETTE[c] + (255,)
    return img


def save(img: Image.Image, size: int, name: str) -> None:
    img.resize((size, size), Image.NEAREST).save(OUT / name)
    print("écrit", name)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    icon = base(padding=0)
    save(icon, 32, "favicon.png")
    save(base(padding=1), 180, "apple-touch-icon.png")  # 18 px × 10
    save(icon, 192, "icon-192.png")
    save(icon, 512, "icon-512.png")
    # Icône « maskable » : le dessin doit tenir dans le cercle central (zone de sécurité de 80 %).
    maskable = Image.new("RGBA", (512, 512), GRASS + (255,))
    maskable.paste(icon.resize((384, 384), Image.NEAREST), (64, 64))
    maskable.save(OUT / "icon-512-maskable.png")
    print("écrit icon-512-maskable.png")


if __name__ == "__main__":
    main()
