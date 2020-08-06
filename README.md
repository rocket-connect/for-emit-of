# for-emit-of
![Node.js CI](https://github.com/danstarns/for-emit-of/workflows/Node.js%20CI/badge.svg?branch=master&event=push) [![npm version](https://badge.fury.io/js/for-emit-of.svg)](https://www.npmjs.com/package/for-emit-of) [![TypeScript Compatible](https://img.shields.io/npm/types/scrub-js.svg)](https://github.com/danstarns/for-emit-of)
 
Turn Node.js Events into Async Iterables.

```
$ npm install for-emit-of
```

# Example
```javascript
import forEmitOf from 'for-emit-of';
import { Emitter } from '..'; // Example

const iterator = forEmitOf(Emitter, {
    event: "data", // Default
});

for await (const event of iterator){
    // Do Something 
}
```

> Equivalent to 

```javascript
Emitter.on("data", () => {});
```

# Transform

```javascript
import forEmitOf from 'for-emit-of';
import { Emitter } from '..';

const iterator = forEmitOf(Emitter, {
    transform: async (event) => { // async aware
        return JSON.stringify(event);
    }
});

for await (const event of iterator){
    // Stringy
}
```

> Equivalent to 

```javascript
Emitter.on("data", (event) => {
    const stringy = JSON.stringify(event);
});
```

# Change the event
```javascript
import forEmitOf from 'for-emit-of';
import { Cart } from '..';

const iterator = forEmitOf(Cart, {
    event: "checkout"
});

for await (const order of iterator){
    // Do Something 
}
```

> Equivalent to 

```javascript
Cart.on("checkout", (order) => { ... });
```

# Change the end
```javascript
import forEmitOf from 'for-emit-of';
import { Cart } from '..';

const iterator = forEmitOf(Cart, {
    end: ["end", "close"] // default
});
```

# Timeout

## `firstEventTimeout`
```javascript
import forEmitOf from 'for-emit-of';
import { EventEmitter } from "events";

const emitter = new EventEmitter();

const iterator = forEmitOf(emitter, {
  firstEventTimeout: 1000,
});

setTimeout(() => {
  emitter.emit("data", {});
}, 2000); // greater than firstEventTimeout ERROR!

for await (const msg of iterator) {
  console.log(msg); // never get here
}
```

## `inBetweenTimeout`
```javascript
import forEmitOf from 'for-emit-of';
import { EventEmitter } from "events";

const emitter = new EventEmitter();

const iterator = forEmitOf(emitter, {
  inBetweenTimeout: 1000,
});

setInterval(() => {
    emitter.emit("data", {})
}, 2000) // greater than inBetweenTimeout ERROR!
 
for await (const msg of iterator) {
  console.log(msg); // gets here once
}
```