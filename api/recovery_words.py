"""
Wordlist and helpers for the email-free recovery-phrase password reset feature.

At registration, each user is given 9 unique, easy-to-write-down words drawn
from WORDLIST. Only their `make_password` hashes are stored (Profile.recovery_keywords).
To reset a password, the user must supply the correct plaintext words at 3
randomly-chosen positions (checked with `check_password`).
"""
import random

# Short, unambiguous, easy-to-transcribe words (no look-alikes like 0/O, l/1).
WORDLIST = [
    "apple", "river", "mountain", "forest", "ocean", "candle", "garden", "bridge",
    "sunset", "harbor", "meadow", "valley", "cloud", "desert", "island", "canyon",
    "pearl", "amber", "coral", "willow", "maple", "cedar", "birch", "aspen",
    "falcon", "eagle", "otter", "rabbit", "badger", "beaver", "dolphin", "panther",
    "tiger", "lion", "wolf", "fox", "bear", "hawk", "raven", "sparrow",
    "guitar", "violin", "trumpet", "piano", "drum", "flute", "lantern", "compass",
    "anchor", "castle", "tower", "cabin", "cottage", "village", "market", "harvest",
    "orchard", "vineyard", "meadowlark", "thunder", "lightning", "breeze", "frost", "ember",
    "copper", "silver", "golden", "crystal", "marble", "granite", "quartz", "velvet",
    "cotton", "linen", "silk", "wool", "leather", "paper", "ink", "quill",
    "journey", "voyage", "summit", "horizon", "twilight", "dawn", "dusk", "shadow",
    "whisper", "echo", "melody", "rhythm", "harmony", "silence", "wonder", "spark",
    "ripple", "current", "tide", "wave", "stone", "pebble", "boulder", "cliff",
]


def generate_recovery_words(count=9):
    """Returns `count` unique, randomly-chosen plaintext words."""
    return random.sample(WORDLIST, count)


def generate_reset_positions(total=9, needed=3):
    """Returns `needed` unique random 1-indexed positions out of `total` words."""
    return sorted(random.sample(range(1, total + 1), needed))
