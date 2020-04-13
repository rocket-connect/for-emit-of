# for-emit-of
> Work in progress 🏗

BADGES

Turn Node.js Events into Async Iterables.

`$ npm install for-emit-of`

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
Order.on("data", () => {});
```