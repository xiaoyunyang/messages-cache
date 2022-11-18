import { Data, MessagesCacheManager } from "./";

interface TestMessage {
  id: string;
  body: string;
}

describe("MessagesCacheManager", () => {
  const syncStateWithCache = jest
    .fn()
    .mockImplementation(
      (allMessagesInCache: Data<TestMessage>) => allMessagesInCache
    );

  const messagesCacheManager = new MessagesCacheManager<TestMessage>(
    syncStateWithCache
  );

  test("Add Messages to empty cache", () => {
    const messages = [
      {
        id: "1",
        body: "1",
      },
      {
        id: "2",
        body: "2",
      },
    ];

    messagesCacheManager.updateMessagesCache(messages);

    expect(syncStateWithCache).toHaveBeenLastCalledWith([
      {
        message: { id: "1", body: "1" },
      },
      {
        message: { id: "2", body: "2" },
      },
    ]);
  });

  test("Send message optimistically adds new message to tail ", () => {
    messagesCacheManager.addMessageOptimistically("temp3", {
      id: "temp3",
      body: "3",
    });

    expect(syncStateWithCache).toHaveBeenLastCalledWith([
      {
        message: { id: "1", body: "1" },
      },
      {
        message: { id: "2", body: "2" },
      },
      {
        message: { id: "temp3", body: "3" },
        sendStatus: "SENDING",
        tempId: "temp3",
      },
    ]);
  });

  test("Send message success adds new entry to cache without updating old message content", () => {
    messagesCacheManager.sendMessageSuccess({ tempId: "temp3", realId: "3" });

    expect(messagesCacheManager.getOne("3")).toEqual({
      message: { id: "temp3", body: "3" },
      tempId: "temp3",
    });

    expect(syncStateWithCache).toHaveBeenLastCalledWith([
      {
        message: { id: "1", body: "1" },
      },
      {
        message: { id: "2", body: "2" },
      },
      {
        message: { id: "temp3", body: "3" },
        tempId: "temp3",
      },
    ]);
  });

  test("Update existing messages in Cache", () => {
    const messages = [
      {
        id: "1",
        body: "1",
      },
      {
        id: "2",
        body: "2",
      },
      {
        id: "3",
        body: "3",
      },
    ];
    messagesCacheManager.updateMessagesCache(messages);

    expect(syncStateWithCache).toHaveBeenLastCalledWith([
      {
        message: { id: "1", body: "1" },
      },
      {
        message: { id: "2", body: "2" },
      },
      {
        message: { id: "3", body: "3" }, // the id changed
        tempId: "temp3",
      },
    ]);
  });

  test("Add message to beginning of Cache", () => {
    const messages = [
      {
        id: "0", // new
        body: "0",
      },
      {
        id: "1",
        body: "1",
      },
      {
        id: "2",
        body: "2",
      },
      {
        id: "3",
        body: "3",
      },
    ];
    messagesCacheManager.updateMessagesCache(messages);

    expect(syncStateWithCache).toHaveBeenLastCalledWith([
      {
        message: { id: "0", body: "0" },
      },
      {
        message: { id: "1", body: "1" },
      },
      {
        message: { id: "2", body: "2" },
      },
      {
        message: { id: "3", body: "3" },
        tempId: "temp3",
      },
    ]);
  });

  test("Send message failed", () => {
    messagesCacheManager.addMessageOptimistically("temp4", {
      id: "temp4",
      body: "4",
    });
    messagesCacheManager.sendMessageFailed({ tempId: "temp4" });
    expect(syncStateWithCache).toHaveBeenNthCalledWith(7, [
      {
        message: { id: "0", body: "0" },
      },
      {
        message: { id: "1", body: "1" },
      },
      {
        message: { id: "2", body: "2" },
      },
      {
        message: { id: "3", body: "3" },
        tempId: "temp3",
      },
      {
        message: { id: "temp4", body: "4" },
        tempId: "temp4",
        sendStatus: "FAILED",
      },
    ]);
  });

  test("Add message to end of cache keeps temp data in cache", () => {
    const messages = [
      {
        id: "0", // new
        body: "0",
      },
      {
        id: "1",
        body: "1",
      },
      {
        id: "2",
        body: "2",
      },
      {
        id: "3",
        body: "3",
      },
      {
        id: "5",
        body: "5",
      },
    ];
    messagesCacheManager.updateMessagesCache(messages);

    expect(syncStateWithCache).toHaveBeenLastCalledWith([
      {
        message: { id: "0", body: "0" },
      },
      {
        message: { id: "1", body: "1" },
      },
      {
        message: { id: "2", body: "2" },
      },
      {
        message: { id: "3", body: "3" },
        tempId: "temp3",
      },
      {
        message: { id: "temp4", body: "4" },
        tempId: "temp4",
        sendStatus: "FAILED",
      },
      {
        message: { id: "5", body: "5" },
      },
    ]);
  });

  test("Resend failed message", () => {
    messagesCacheManager.resendMessage("temp4");
    expect(syncStateWithCache).toHaveBeenLastCalledWith([
      {
        message: { id: "0", body: "0" },
      },
      {
        message: { id: "1", body: "1" },
      },
      {
        message: { id: "2", body: "2" },
      },
      {
        message: { id: "3", body: "3" },
        tempId: "temp3",
      },
      {
        message: { id: "temp4", body: "4" },
        tempId: "temp4",
        sendStatus: "SENDING",
      },
      {
        message: { id: "5", body: "5" },
      },
    ]);
  });

  test("Successfully sent message in the middle of cache", () => {
    messagesCacheManager.sendMessageSuccess({ tempId: "temp4", realId: "4" });
    expect(syncStateWithCache).toHaveBeenLastCalledWith([
      {
        message: { id: "0", body: "0" },
      },
      {
        message: { id: "1", body: "1" },
      },
      {
        message: { id: "2", body: "2" },
      },
      {
        message: { id: "3", body: "3" },
        tempId: "temp3",
      },
      {
        message: { id: "5", body: "5" },
      },
      {
        message: { id: "temp4", body: "4" },
        tempId: "temp4",
      },
    ]);
  });
});
