function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

// Taken from http://stackoverflow.com/a/105074/515584
export function createUUID() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
