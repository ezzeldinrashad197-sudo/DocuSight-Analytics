import hashlib
import subprocess
import re

p = subprocess.run(["git", "show", "HEAD:src/utils/calculations.ts"], capture_output=True, text=True)
orig_content = p.stdout
print("Original from HEAD~1 length:", len(orig_content))

# Extract the hunks from patch
with open("structusight-remediation.patch", "r", encoding="utf-8", errors="ignore") as f:
    patch = f.read()

m = re.search(r"diff -ruN orig/src/utils/calculations\.ts final/src/utils/calculations\.ts\n(.*?)(?=\ndiff -ruN |\Z)", patch, re.DOTALL)
lines = m.group(1).split("\n")

hunks = []
cur_hunk = []
for l in lines[2:]:
    if l.startswith("@@"):
        if cur_hunk:
            hunks.append(cur_hunk)
        cur_hunk = [l]
    elif cur_hunk:
        cur_hunk.append(l)
if cur_hunk:
    hunks.append(cur_hunk)

res = orig_content
for i, h in enumerate(hunks):
    old_lines = []
    new_lines = []
    for l in h[1:]:
        if l.startswith("-"):
            old_lines.append(l[1:])
        elif l.startswith("+"):
            new_lines.append(l[1:])
        elif l.startswith(" "):
            old_lines.append(l[1:])
            new_lines.append(l[1:])
    old_str = "\n".join(old_lines)
    new_str = "\n".join(new_lines)
    if old_str in res:
        print(f"Hunk {i} matched directly!")
        res = res.replace(old_str, new_str, 1)
    else:
        print(f"Hunk {i} NOT matched directly, searching...")

computed_hash = hashlib.sha256(res.encode("utf-8")).hexdigest()
print("Computed hash:", computed_hash)
print("Expected hash: c1dc8a753a045e920905c82c603e4620f18cf757eebf2b09cf486ee0ca8c2b75")

with open("src/utils/calculations.ts", "w", encoding="utf-8") as f:
    f.write(res)
