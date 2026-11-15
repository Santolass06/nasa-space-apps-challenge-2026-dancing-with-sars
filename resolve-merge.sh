#!/usr/bin/env bash
# Junta um ref no branch actual e resolve os conflitos das docs por união sem duplicados.
# Uso: resolve-merge.sh <ref> <mensagem>
set -euo pipefail
REF="$1"; MSG="$2"
git merge --no-ff "$REF" -m "$MSG" >/dev/null 2>&1 || true
python3 - <<'PY'
import re, pathlib, subprocess
pat = re.compile(r"<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> [^\n]+\n", re.S)
files = subprocess.run(["git", "diff", "--name-only", "--diff-filter=U"],
                       capture_output=True, text=True).stdout.split()
for name in files:
    p = pathlib.Path(name)
    if p.suffix != ".md":
        raise SystemExit(f"conflito inesperado fora das docs: {name}")
    t = p.read_text(encoding="utf-8")
    def union(m):
        seen, out = set(), []
        for line in (m.group(1) + m.group(2)).splitlines():
            if line.strip() and line not in seen:
                seen.add(line); out.append(line)
        return "\n".join(out) + "\n"
    t2, n = pat.subn(union, t)
    assert "<<<<<<<" not in t2 and ">>>>>>>" not in t2, name
    p.write_text(t2, encoding="utf-8")
    print(f"  {name}: {n} bloco(s) unido(s)")
PY
git add -A
if [ -n "$(git diff --name-only --diff-filter=U)" ]; then echo "ainda ha conflitos"; exit 1; fi
git commit -q --no-edit
echo "  -> $(git rev-parse --short HEAD) $(git log --oneline -1 --format=%s)"
