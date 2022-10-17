const getNewNodeAddWarning = (id) =>
  `cannot add node with id=${id} because a node with this id already already exists in the cache`;

export class MessagesCache {
  constructor() {
    this.cache = new Map();
    this.head = {};
    this.tail = {};

    // tail and head are stub nodes
    // so the actual last node is tail.prev
    // this way, we can guarantee that every node
    // has a prev and a next. This makes the update
    // logic simpler
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Deletes a single message from the cache
   * @param {string} id
   * @returns
   */
  deleteOne(id) {
    // we don't have to return an error to avoid a noisy console
    // the current state of the cache already represent the end
    // state we want the cache to be so there's no additional action
    // for the caller of this method
    if (!this.cache.get(id)) return;

    const node = this.cache.get(id);

    node.prev.next = node.next;
    node.next.prev = node.prev;

    this.cache.delete(id);
  }

  /**
   *
   * @param {string} id
   * @param {*} newData
   * @returns
   */
  updateOne(id, newData) {
    if (!this.cache.get(id)) {
      console.error(
        `cannot update node with id=${id} because it doesn't exist in the cache`
      );
      return;
    }
    const node = this.cache.get(id);
    node.data = newData;
  }

  /**
   *
   * @param {string} id
   * @param {*} data
   * @returns
   */
  addOneAtTail(id, data) {
    if (this.cache.get(id)) {
      console.error(getNewNodeAddWarning(id));
      return;
    }
    // assumption: what we are adding does not
    // already exist in the cache
    const prevLastNode = this.tail.prev;
    const newNode = {
      id,
      data,
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

  /**
   *
   * @param {Array} newMessages
   */
  addManyAtTail(newMessages) {
    for (let i = 0; i < newMessages.length; i++) {
      const { id, data } = newMessages[i];
      this.addOneAtTail(id, data);
    }
  }

  /**
   *
   * @param {string} id
   * @param {*} data
   * @returns
   */
  addOneAtHead(id, data) {
    if (this.cache.get(id)) {
      console.error(getNewNodeAddWarning(id));
      return;
    }
    const newNode = {
      id,
      data,
    };

    const prevHead = this.head.next;
    prevHead.prev = newNode;
    newNode.next = prevHead;

    this.head.next = newNode;
    newNode.prev = this.head;

    this.cache.set(id, newNode);
  }

  /**
   *
   * @param {Array} newMessages
   */
  addManyAtHead(newMessages) {
    for (let i = newMessages.length - 1; i >= 0; i--) {
      const { id, data } = newMessages[i];
      this.addOneAtHead(id, data);
    }
  }

  /**
   *
   * @param {string} oldId
   * @param {string} newId
   * @param {*} newData
   * @returns
   */
  replaceOne(oldId, newId, newData) {
    const oldNode = this.cache.get(oldId);

    // Although in perfect use, we don't expect the API user to call this
    // function to replace a non-existent node with a new node or
    // to replace an existing node with another existing node
    // Make our API fault tolerant and not error out if the API user makes
    // mistakes like calling this API with the wrong oldId
    if (!oldNode) {
      console.error(
        `cannot replace old node id=${oldId} with new node id=${newId} because the old node doesn't exist in the cache`
      );
      return;
    }
    if (this.cache.has(newId)) {
      console.error(
        `cannot replace replace old node id=${oldId} with new node id=${newId} because the new node already exists in the cache`
      );
      return;
    }
    const newNode = {
      id: newId,
      data: newData,
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

  /**
   * retrieves the message with the given id from cache
   * @param {string} id
   * @returns {*} data
   */
  getOne(id) {
    if (!this.cache.has(id)) return null;

    return this.cache.get(id).data;
  }

  /**
   *
   * @returns {Array<*>} an array of messages in the cache
   */
  getAll() {
    const res = [];
    let curr = this.head.next;

    while (curr.next) {
      // we don't need to worry about handling the null
      // case of getOne because that indicates we have corrupt
      // cache data, which should cause getAll to fail
      res.push(this.cache.get(curr.id).data);
      curr = curr.next;
    }

    return res;
  }
}
