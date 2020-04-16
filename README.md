# for-emit-of
![Node.js CI](https://github.com/danstarns/for-emit-of/workflows/Node.js%20CI/badge.svg?branch=master&event=push) [![npm version](https://badge.fury.io/js/for-emit-of.svg)](https://www.npmjs.com/package/for-emit-of)
 
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