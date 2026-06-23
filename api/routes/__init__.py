from . import health, chat, cities, hotels, deals, maps, translations, tools

MODULES = (health, chat, cities, hotels, deals, maps, translations, tools)


def register_all(router):
    for module in MODULES:
        module.register(router)
