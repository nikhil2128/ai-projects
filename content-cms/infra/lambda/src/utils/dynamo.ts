import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { NativeAttributeValue } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export async function getItem<T>(
  tableName: string,
  key: Record<string, NativeAttributeValue>,
): Promise<T | undefined> {
  const result = await ddb.send(new GetCommand({ TableName: tableName, Key: key }));
  return result.Item as T | undefined;
}

export async function putItem(
  tableName: string,
  item: Record<string, NativeAttributeValue>,
): Promise<void> {
  await ddb.send(new PutCommand({ TableName: tableName, Item: item }));
}

export async function deleteItem(
  tableName: string,
  key: Record<string, NativeAttributeValue>,
): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: tableName, Key: key }));
}

export async function queryByIndex<T>(
  tableName: string,
  indexName: string,
  keyName: string,
  keyValue: string,
): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, NativeAttributeValue> | undefined;

  do {
    const result = await ddb.send(new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: `#k = :v`,
      ExpressionAttributeNames: { '#k': keyName },
      ExpressionAttributeValues: { ':v': keyValue },
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items as T[] ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

export async function scanAll<T>(tableName: string): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, NativeAttributeValue> | undefined;

  do {
    const result = await ddb.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items as T[] ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

export async function updateItem(
  tableName: string,
  key: Record<string, NativeAttributeValue>,
  updates: Record<string, NativeAttributeValue>,
): Promise<void> {
  const entries = Object.entries(updates).filter(([k]) => !(k in key));
  if (entries.length === 0) return;

  const expression = 'SET ' + entries.map(([k], i) => `#f${i} = :v${i}`).join(', ');
  const names: Record<string, string> = {};
  const values: Record<string, NativeAttributeValue> = {};
  entries.forEach(([k, v], i) => {
    names[`#f${i}`] = k;
    values[`:v${i}`] = v;
  });

  await ddb.send(new UpdateCommand({
    TableName: tableName,
    Key: key,
    UpdateExpression: expression,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function batchDeleteByIds(
  tableName: string,
  ids: string[],
  keyName = 'id',
): Promise<void> {
  const batches: Record<string, NativeAttributeValue>[][] = [];
  for (let i = 0; i < ids.length; i += 25) {
    batches.push(ids.slice(i, i + 25).map(id => ({ [keyName]: id })));
  }
  for (const batch of batches) {
    await ddb.send(new BatchWriteCommand({
      RequestItems: {
        [tableName]: batch.map(key => ({ DeleteRequest: { Key: key } })),
      },
    }));
  }
}

export { QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
