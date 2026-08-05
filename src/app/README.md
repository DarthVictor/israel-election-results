# Application shell

`app/` owns top-level composition and cross-feature wiring. Product UI is added
in later phases; it should depend on domain contracts rather than generated data
file details.
