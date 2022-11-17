// The error message should only come up in development during implementation
const getNewNodeAddWarning = (id: string) =>
  `cannot add node with id=${id} because a node with this id already already exists in the cache`;

interface EndNode<Data> {
  type: "END_NODE";
  prev?: Node<Data> | EndNode<Data>;
  next?: Node<Data> | EndNode<Data>;
}
interface Node<Data> {
  type: "DATA_NODE";
  prev: Node<Data> | EndNode<Data>;
  next: Node<Data> | EndNode<Data>;
  id: string;
  data: Data;
}

const isCacheNode = <T>(node: Node<T> | EndNode<T>): node is Node<T> =>
  node.type === "DATA_NODE";

export class MessagesCache<CacheData> {
  private cache: Map<string, Node<CacheData>>;
  private head: EndNode<CacheData>;
  private tail: EndNode<CacheData>;

  constructor() {
    this.cache = new Map();
    this.head = { type: "END_NODE" };
    this.tail = { type: "END_NODE" };

    // tail and head are stub nodes
    // so the actual last node is tail.prev
    // this way, we can guarantee that every node
    // has a prev and a next. This makes the update
    // logic simpler
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  public deleteOne(id: string) {
    const node = this.cache.get(id);

    // we don't have to return an error to avoid a noisy console
    // the current state of the cache already represent the end
    // state we want the cache to be so there's no additional action
    // for the caller of this method
    if (!node) return;

    if (!node.prev || !node.next) return;

    node.prev.next = node.next;
    node.next.prev = node.prev;

    this.cache.delete(id);
  }

  updateOne(id: string, newData: CacheData) {
    const node = this.cache.get(id);
    if (!node) {
      // eslint-disable-next-line no-console
      console.error(
        `cannot update node with id=${id} because it doesn't exist in the cache`
      );
      return;
    }

    node.data = newData;
  }

  addOneAtTail(id: string, data: CacheData) {
    if (this.cache.get(id)) {
      // eslint-disable-next-line no-console
      console.error(getNewNodeAddWarning(id));
      return;
    }
    // assumption: what we are adding does not
    // already exist in the cache
    const prevLastNode = this.tail.prev;

    if (!prevLastNode) return;

    const newNode: Node<CacheData> = {
      type: "DATA_NODE",
      id,
      data,
      prev: this.tail,
      next: this.tail,
    };

    // make old last node and
    // new last node point to each other
    newNode.prev = prevLastNode;
    prevLastNode.next = newNode;

    // make new last node the tail
    this.tail.prev = newNode;
    newNode.next = this.tail;

    // update the cache
    this.cache.set(id, newNode);
  }

  addManyAtTail(newMessages: Array<{ id: string; data: CacheData }>) {
    // eslint-disable-next-line no-loops/no-loops
    for (let i = 0; i < newMessages.length; i += 1) {
      const { id, data } = newMessages[i];
      this.addOneAtTail(id, data);
    }
  }

  addOneAtHead(id: string, data: CacheData) {
    if (this.cache.get(id)) {
      // eslint-disable-next-line no-console
      console.error(getNewNodeAddWarning(id));
      return;
    }
    const newNode: Node<CacheData> = {
      type: "DATA_NODE" as const,
      id,
      data,
      prev: this.tail,
      next: this.tail,
    };

    const prevHead = this.head.next;
    if (!prevHead) return;
    prevHead.prev = newNode;
    newNode.next = prevHead;

    this.head.next = newNode;
    newNode.prev = this.head;

    this.cache.set(id, newNode);
  }

  addManyAtHead(newMessages: Array<{ id: string; data: CacheData }>) {
    /* eslint-disable no-loops/no-loops */

    for (let i = newMessages.length - 1; i >= 0; i -= 1) {
      const { id, data } = newMessages[i];
      this.addOneAtHead(id, data);
    }
  }

  replaceOne(oldId: string, newId: string, newData: CacheData) {
    const oldNode = this.cache.get(oldId);

    // Although in perfect use, we don't expect the API user to call this
    // function to replace a non-existent node with a new node or
    // to replace an existing node with another existing node
    // Make our API fault tolerant and not error out if the API user makes
    // mistakes like calling this API with the wrong oldId
    if (!oldNode) {
      // eslint-disable-next-line no-console
      console.error(
        `cannot replace old node id=${oldId} with new node id=${newId} because the old node doesn't exist in the cache`
      );
      return;
    }
    if (this.cache.has(newId)) {
      // eslint-disable-next-line no-console
      console.error(
        `cannot replace old node id=${oldId} with new node id=${newId} because the new node already exists in the cache`
      );
      return;
    }
    const newNode: Node<CacheData> = {
      type: "DATA_NODE" as const,
      id: newId,
      data: newData,
      prev: this.tail,
      next: this.tail,
    };

    // make nodes adjacent to oldNode point to newNode instead
    oldNode.prev.next = newNode;
    newNode.prev = oldNode.prev;
    oldNode.next.prev = newNode;
    newNode.next = oldNode.next;

    // update the cache
    this.cache.set(newId, newNode);
    this.cache.delete(oldId);
  }

  getOne(id: string) {
    if (!this.cache.has(id)) return null;

    return (this.cache.get(id) as Node<CacheData>).data;
  }

  getAll() {
    const res = [];
    let curr = this.head.next;

    while (curr && isCacheNode<CacheData>(curr) && curr?.next) {
      // we don't need to worry about handling the null
      // case of getOne because that indicates we have corrupt
      // cache data, which should cause getAll to fail

      res.push(this.cache.get(curr.id)?.data);

      curr = curr.next;
    }

    return res;
  }
}
