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
cache.addOneAtHead(2, "Hi");
```

```js
cache.addOneAtTail(1, "Hey, what's up?");
```

Batch operations

```js
cache.addManyAtHead([
  { id: 5, data: "Hello" },
  { id: 6, data: "I like your profile. Would you like to connect?" },
]);
```

```js
cache.addManyAtTail([
  { id: 7, data: "Are you there?" },
  { id: 8, data: "Sorry, I've been busy." },
]);
```

### Update

Updating the value of an existing record in the cache by key.

```js
cache.updateOne(8, "Sorry, I've been busy. I'll get back to you soon!");
```

Replace the message with the key with a new message with a different key while keeping its position relative to the other messages.

```js
cache.replaceOne(1, 3, "Hey, how are you?");
```

Delete one message with the given key.

```js
cache.deleteOne(5);
```

### Read Cache

Retrieves the data that with the given key. Returns `null` if there is no message with that id.

```js
cache.getOne(4); //> null
```

Retrieves all the data in the cache.

```js
cache.getAll();
```

For this example, assuming all the operations are called in the same order as written, the result of `cache.getAll()` will be

```js
[
  "I like your profile. Would you like to connect?",
  "Hi",
  "Hey, how are you?",
  "Are you there?",
  "Sorry, I've been busy. I'll get back to you soon!",
];
```

## API

- `addOneAtTail(id: string, data: any)`
- `addManyAtTail(messages: { id: string, data: any }[])`
- `addOneAtHead(id: string, data: any)`
- `addManyAtHead(messages: { id: string, data: any }[])`
- `updateOne(oldId: string, newId: string, newData: any)`
- `replaceOne(oldId: string, newId: string, newData: any)`
- `deleteOne(id: string)`
- `getOne(id: string)`
- `getAll()`
