# messages-cache

A general purpose cache for storing heterogeneous message data but it's recommended that the user of this cache implement some consistent schema on the data stored in the cache.

An example use case is a chat application that supports offline mode.

A message has an `id` and `data` and are related to other messages based on the order in which they are added into the cache and how they are added to the cache.

There are two ways to add messages to the cache:

1. To the beginning (e.g. loading older messages in a chat app)
2. To the end (e.g. receiving a new message in a chat app)

This cache is designed for use in a JavaScript application that needs to store linear data which needs to be frequently retrieved and updated by reference to its key.

## Installation

## Usage

### Instantiation

```js
const cache = new MessagesCache();
```

### Add

Single add

```js
cache.addOneAtTail(1, 1);
cache.addOneAtHead(2, 2);
```

Batch operations

```js
cache.addBunchAtHead([
  { id: 5, data: 5 },
  { id: 6, data: 6 },
]);
```

### Delete

```js
cache.delete(1);
```

### Update

```js
cache.updateMessage(9, 9);
cache.replaceMessage(2, 4, 4);
```

### Read Cache

```js
cache.get(4);
cache.getCacheData();
```

## API

- `addOneAtTail(id: string, data: any)`
- `addOneAtHead(id: string, data: any)`
- `addBunchAtHead(messages: { id: string, data: any }[])`
- `replaceMessage(oldId: string, newId: string, newData: any)`
- `updateMessage(oldId: string, newId: string, newData: any)`
- `get(id: string)`
- `delete(id: string)`
- `getCacheData()`
