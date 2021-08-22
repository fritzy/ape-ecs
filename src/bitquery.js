

class BitQuery {

    constructor(world, query) {
        this.world = world;
        this.registry = world.registry;
        this.results = new Set();
        this.system = query.system || null;
        this.mask = 0n;
    }

    execute() {
    }

    refresh() {
    }
}

module.exports = BitQuery;