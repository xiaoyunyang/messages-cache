export enum SendStatus {
  FAILED = "FAILED",
  SENDING = "SENDING",
}

export interface Data<Message> {
  message: Message;
  sendStatus?: SendStatus;
  tempId?: string;
}

interface EndNode<Message> {
  type: "END_NODE";
  prev?: DataNode<Message> | EndNode<Message>;
  next?: DataNode<Message> | EndNode<Message>;
}
export interface DataNode<Message> {
  type: "DATA_NODE";
  prev: DataNode<Message> | EndNode<Message>;
  next: DataNode<Message> | EndNode<Message>;
  id: string;
  data: Data<Message>;
}

const isDataNode = <Message>(
  node: DataNode<Message> | EndNode<Message>
): node is DataNode<Message> => node.type === "DATA_NODE";

// The error message should only come up in development during implementation
const getNewNodeAddWarning = (id: string) =>
  `cannot add node with id=${id} because a node with this id already already exists in the cache`;

export class MessagesCacheManager<Message extends { id: string }> {
  private cache: Map<string, DataNode<Message>>;
  private head: EndNode<Message>;
  private tail: EndNode<Message>;
  private syncStateWithCache: (messagesWithData: Array<Data<Message>>) => void;

  constructor(
    syncStateWithCache: (messagesWithData: Array<Data<Message>>) => void
  ) {
    this.cache = new Map();
    this.syncStateWithCache = syncStateWithCache;
    this.head = { type: "END_NODE" };
    this.tail = { type: "END_NODE" };

    // tail and head are stub nodes so the actual last node is tail.prev
    // this way, we can guarantee that every node has a prev and a next.
    // This makes the update logic simpler
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  private deleteOne(id: string) {
    const node = this.cache.get(id);

    // we don't have to return an error to avoid a noisy console
    // the current state of the cache already represents the end
    // state we want the cache to be so there's no additional action
    // for the caller of this method
    if (!node) return;

    if (!node.prev || !node.next) return;

    node.prev.next = node.next;
    node.next.prev = node.prev;

    this.cache.delete(id);
  }

  private updateOne(id: string, newData: Data<Message>) {
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

  private addOneAtTail(id: string, data: Data<Message>) {
    if (this.cache.get(id)) {
      // eslint-disable-next-line no-console
      console.error(getNewNodeAddWarning(id));
      return;
    }
    // assumption: what we are adding does not
    // already exist in the cache
    const prevLastNode = this.tail.prev;

    if (!prevLastNode) return;

    const newNode: DataNode<Message> = {
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

  private addManyAtTail(newMessages: Array<Message>) {
    // eslint-disable-next-line no-loops/no-loops
    for (let i = 0; i < newMessages.length; i += 1) {
      const message = newMessages[i];
      const id = message.id;
      this.addOneAtTail(id, { message });
    }
  }

  private addOneAtHead(id: string, data: Data<Message>) {
    if (this.cache.get(id)) {
      // eslint-disable-next-line no-console
      console.error(getNewNodeAddWarning(id));
      return;
    }
    const newNode: DataNode<Message> = {
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

  private addManyAtHead(newMessages: Array<Message>) {
    /* eslint-disable no-loops/no-loops */
    for (let i = newMessages.length - 1; i >= 0; i -= 1) {
      const message = newMessages[i];
      const id = message.id;
      this.addOneAtHead(id, { message });
    }
  }

  getOne(id: string) {
    if (!this.cache.has(id)) return null;

    return (this.cache.get(id) as DataNode<Message>).data;
  }

  private getAll() {
    const res: Array<Data<Message>> = [];
    let curr = this.head.next;

    while (curr && isDataNode<Message>(curr) && curr?.next) {
      // we don't need to worry about handling the null
      // case of getOne because that indicates we have corrupt
      // cache data, which should cause getAll to fail

      const messageData = this.cache.get(curr.id);

      if (messageData) {
        res.push(messageData.data);
      }

      curr = curr.next;
    }

    return res;
  }

  addMessageOptimistically = (tempId: string, message: Message) => {
    this.addOneAtTail(tempId, {
      tempId,
      message,
      sendStatus: SendStatus.SENDING,
    });
    this.syncStateWithCache(this.getAll());
  };

  sendMessageSuccess({ tempId, realId }: { tempId: string; realId: string }) {
    // create new entry for real message
    const message = this.getOne(tempId)?.message;
    if (!message) return;

    this.deleteOne(tempId);
    this.addOneAtTail(realId, { message, tempId });
    this.syncStateWithCache(this.getAll());
  }

  sendMessageFailed({ tempId }: { tempId: string }) {
    const messageData = this.getOne(tempId);
    if (!messageData) return;

    this.updateOne(tempId, { ...messageData, sendStatus: SendStatus.FAILED });
    this.syncStateWithCache(this.getAll());
  }

  resendMessage(id: string) {
    const messageData = this.getOne(id);
    if (!messageData) return;

    this.updateOne(id, {
      ...messageData,
      sendStatus: SendStatus.SENDING,
    });
    this.syncStateWithCache(this.getAll());
  }

  updateMessagesCache(messages: Array<Message>) {
    // There are three types of updates which can occur when this function is called
    // 1. Older messages from the previous page are loaded
    // 2. A new message is received
    // 3. An existing message is updated. This can happen when a message is read or gets a reaction from the recipient

    // Let `left` and `right` be indices for the boundaries of messages subarray containing messages which are already in the cache
    // We can use left and right to partition the messages array into these three segments:
    // [0, left), [left, right), [right, messages.length)
    // Segment 1 contains older messages loaded from previous pages which are not in the cache
    // Segment 2 contains the messages which are already in the cache
    // Segment 3 contains the newer messages which are not in the cache
    // We need different cache update strategies for each of these segments

    // Update segment 1
    const left = Math.max(
      0,
      messages.findIndex((message) => this.cache.has(message.id))
    );
    const headMessages = messages.slice(0, left);
    this.addManyAtHead(headMessages);

    // Update segment 3
    let right = messages.length - 1;
    while (right >= 0 && !this.cache.has(messages[right].id)) {
      right -= 1;
    }
    const tailMessages = messages.slice(right + 1, messages.length);
    this.addManyAtTail(tailMessages);

    // Update segment 2:
    // We don't know exactly which message changed (got a reaction or got read) so we will update all of them
    // Key assumption: all the messages in this interval we are traversing exist in the cache
    // There can be some messages in the cache that are not in the interval. These won't get touched
    for (let i = left; i <= right; i += 1) {
      const message = messages[i];
      const cacheMessage = this.getOne(message.id);
      this.updateOne(message.id, {
        ...cacheMessage,
        message,
      });
    }

    this.syncStateWithCache(this.getAll());
  }
}
