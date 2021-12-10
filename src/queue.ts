interface Node<T> {
  value: T;
  next?: Node<T>;
}

export interface Queue<T = any> {
  length: number;
  shift(): T | undefined;
  push(value: T): void;
}

export function getQueue<T = any>(): Queue<T> {
  let first: Node<T> | undefined;
  let last: Node<T> | undefined;
  return {
    length: 0,
    shift() {
      if (first) {
        const { value } = first;
        first = first.next;
        if (!first) {
          last = first;
        }
        this.length--;
        return value;
      }
    },
    push(value: T) {
      const node = { value };
      if (!last) {
        first = last = node;
      } else {
        last = last.next = node;
      }
      this.length++;
    },
  };
}
