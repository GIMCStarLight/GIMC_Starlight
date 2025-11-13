"""Infrastructure services layer.

This package hosts stable service integrations (DB, metrics, etc.) that
the rest of the application depends on. Public API remains backward
compatible via thin shims in legacy modules under task_control/.
"""