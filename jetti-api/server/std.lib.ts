import { CatalogUser } from './models/Catalogs/Catalog.User';
import { EXCHANGE_POOL } from './sql.pool.exchange';
import { getUserPermissions } from './fuctions/UsersPermissions';
import { RefValue, Type } from './models/common-types';
import { configSchema } from './models/config';
import { DocumentBase, Ref } from './models/document';
import { createDocument, IFlatDocument, INoSqlDocument } from './models/documents.factory';
import { createDocumentServer, DocumentBaseServer } from './models/documents.factory.server';
import { DocTypes, CatalogTypes } from './models/documents.types';
import { RegisterAccumulationTypes } from './models/Registers/Accumulation/factory';
import { RegisterAccumulation } from './models/Registers/Accumulation/RegisterAccumulation';
import { RegistersInfo } from './models/Registers/Info/factory';
import { RegisterInfo } from './models/Registers/Info/RegisterInfo';
import { adminMode, postDocument, unpostDocument, updateDocument, setPostedSate, insertDocument } from './routes/utils/post';
import { MSSQL } from './mssql';
import { v1 } from 'uuid';
import { BankStatementUnloader } from './fuctions/BankStatementUnloader';
import { IAttachmentsSettings, CatalogAttachment } from './models/Catalogs/Catalog.Attachment';
import { x100 } from './x100.lib';
import { TASKS_POOL } from './sql.pool.tasks';
import { IQueueRow } from './models/Tasks/common';

export interface BatchRow { SKU: Ref; Storehouse: Ref; Qty: number; Cost: number; batch: Ref; rate: number; }

export interface JTL {
  account: {
    balance: (account: Ref, date: Date, company: Ref, tx: MSSQL) => Promise<number | null>,
    debit: (account: Ref, date: Date, company: Ref, tx: MSSQL) => Promise<number | null>,
    kredit: (account: Ref, date: Date, company: Ref, tx: MSSQL) => Promise<number | null>,
    byCode: (code: string, tx: MSSQL) => Promise<string | null>
  };
  register: {
    movementsByDoc: <T extends RegisterAccumulation>(type: RegisterAccumulationTypes, doc: Ref, tx: MSSQL) => Promise<T[]>,
    balance: (type: RegisterAccumulationTypes, date: Date, resource: string[],
      analytics: { [key: string]: Ref }, tx: MSSQL) => Promise<{ [x: string]: number } | null>,
  };
  doc: {
    byCode: (type: DocTypes, code: string, tx: MSSQL) => Promise<string | null>;
    byId: (id: Ref, tx: MSSQL) => Promise<IFlatDocument | null>;
    byIdT: <T extends DocumentBase>(id: Ref, tx: MSSQL) => Promise<T | null>;
    historyById: (id: Ref, tx: MSSQL) => Promise<IFlatDocument | null>;
    findDocumentByProps: <T>(
      type: CatalogTypes,
      propsFilter: { propKey: string, propValue: any }[],
      tx: MSSQL,
      options?: {
        matching?: 'OR' | 'AND',
        selectedFields?: string[],
        first?: number,
        order?: string[],
        excludeDeleted?: boolean
      }
    ) => Promise<T[]>;
    isDocumentUsedInAccumulationWithPropValueById: (docId: string, propValue: any, tx: MSSQL) => Promise<boolean>
    Ancestors: (id: Ref, tx: MSSQL, level?: number) => Promise<{ id: Ref, parent: Ref, level: number }[] | Ref | null>;
    Descendants: (id: Ref, tx: MSSQL) => Promise<{ id: Ref, parent: Ref }[] | null>;
    haveDescendants: (id: Ref, tx: MSSQL) => Promise<boolean>;
    formControlRef: (id: Ref, tx: MSSQL) => Promise<RefValue | null>;
    postById: (id: Ref, tx: MSSQL) => Promise<DocumentBaseServer>;
    unPostById: (id: Ref, tx: MSSQL) => Promise<DocumentBaseServer>;
    createDoc: <T extends DocumentBase>(type: DocTypes, document?: IFlatDocument) => Promise<T>;
    createDocServer: <T extends DocumentBaseServer>(type: DocTypes, document: IFlatDocument | undefined, tx: MSSQL) => Promise<T>;
    createDocServerById: <T extends DocumentBaseServer>(id: string, tx: MSSQL) => Promise<T | null>;
    saveDoc: (servDoc: DocumentBaseServer, tx: MSSQL) => Promise<DocumentBaseServer>
    noSqlDocument: (flatDoc: IFlatDocument) => INoSqlDocument | null;
    flatDocument: (noSqldoc: INoSqlDocument) => IFlatDocument | null;
    docPrefix: (type: DocTypes, tx: MSSQL) => Promise<string>
  };
  info: {
    sliceLast: <T extends RegistersInfo>(type: string, date: Date, company: Ref,
      analytics: { [key: string]: any }, tx: MSSQL) => Promise<T | null>,
    exchangeRate: (date: Date, company: Ref, currency: Ref, tx: MSSQL) => Promise<number>
  };
  util: {
    addAttachments: (attachments: CatalogAttachment[], tx: MSSQL) => Promise<any[]>
    delAttachments: (attachmentsId: Ref[], tx: MSSQL) => Promise<boolean>
    getAttachmentsByOwner: (ownerId: Ref, withDeleted: boolean, tx: MSSQL) => Promise<CatalogAttachment[]>
    getAttachmentStorageById: (attachmentId: Ref, tx: MSSQL) => Promise<string>
    getAttachmentsSettingsByOwner: (ownerId: Ref, tx: MSSQL) => Promise<IAttachmentsSettings[]>
    salaryCompanyByCompany: (company: Ref, tx: MSSQL) => Promise<string | null>
    bankStatementUnloadById: (docsID: string[], tx: MSSQL) => Promise<string>,
    adminMode: (mode: boolean, tx: MSSQL) => Promise<void>,
    closeMonth: (company: Ref, date: Date, tx: MSSQL) => Promise<void>,
    getUserRoles: (user: CatalogUser) => Promise<string[]>,
    isRoleAvailable: (role: string, user: CatalogUser) => Promise<boolean>,
    closeMonthErrors: (company: Ref, date: Date, tx: MSSQL) => Promise<{ Storehouse: Ref; SKU: Ref; Cost: number }[] | null>
    GUID: () => Promise<string>,
    getObjectPropertyById: (id: string, propPath: string, tx: MSSQL) => Promise<any>
    exchangeDB: () => MSSQL,
    taskPoolTx: () => MSSQL
  };
  queue: {
    insertQueue: (row: IQueueRow, taskPoolTx?: MSSQL) => Promise<IQueueRow>
    updateQueue: (row: IQueueRow, taskPoolTx?: MSSQL) => Promise<IQueueRow>
    deleteQueue: (id: string, taskPoolTx?: MSSQL) => Promise<void>
    getQueueById: (id: string, taskPoolTx?: MSSQL) => Promise<IQueueRow | null>
  };
}

export const lib: JTL = {
  account: {
    balance,
    debit,
    kredit,
    byCode: accountByCode
  },
  register: {
    balance: registerBalance,
    movementsByDoc
  },
  doc: {
    byCode,
    byId,
    byIdT,
    findDocumentByProps,
    createDoc,
    createDocServer,
    createDocServerById,
    saveDoc,
    historyById,
    Ancestors,
    Descendants,
    haveDescendants,
    formControlRef,
    postById,
    unPostById,
    noSqlDocument,
    flatDocument,
    docPrefix,
    isDocumentUsedInAccumulationWithPropValueById
  },
  info: {
    sliceLast,
    exchangeRate
  },
  util: {
    addAttachments,
    delAttachments,
    getAttachmentsByOwner,
    getAttachmentStorageById,
    getAttachmentsSettingsByOwner,
    salaryCompanyByCompany,
    bankStatementUnloadById,
    adminMode,
    closeMonth,
    getUserRoles,
    isRoleAvailable,
    GUID,
    closeMonthErrors,
    getObjectPropertyById,
    exchangeDB,
    taskPoolTx
  },
  queue: {
    insertQueue,
    updateQueue,
    deleteQueue,
    getQueueById
  }
};

async function GUID(): Promise<string> {
  return v1().toLocaleUpperCase();
}

async function accountByCode(code: string, tx: MSSQL): Promise<string | null> {
  const result = await tx.oneOrNone<any>(`
    SELECT id result FROM [Catalog.Account.v]  WITH (NOEXPAND) WHERE code = @p1`, [code]);
  return result ? result.result as string : null;
}

async function byCode(type: string, code: string, tx: MSSQL): Promise<string | null> {
  const result = await tx.oneOrNone<{ result: string }>(`SELECT id result FROM [${type}.v]  WITH (NOEXPAND) WHERE code = @p1`, [code]);
  return result ? result.result as string : null;
}

async function byId(id: string, tx: MSSQL): Promise<IFlatDocument | null> {
  if (!id) return null;
  const result = await tx.oneOrNone<INoSqlDocument | null>(`
  SELECT * FROM "Documents" WHERE id = @p1`, [id]);
  if (result) return flatDocument(result); else return null;
}

async function historyById(historyId: string, tx: MSSQL): Promise<IFlatDocument | null> {
  if (!historyId) return null;
  const result = await tx.oneOrNone<INoSqlDocument | null>(`
  SELECT
    _id id
    ,type
    ,date
    ,code
    ,description
    ,posted
    ,deleted
    ,doc
    ,parent
    ,isfolder
    ,company
    ,user
    ,_timestamp
 FROM "Documents.Hisroty" WHERE id = @p1`, [historyId]);
  if (result) return flatDocument(result); else return null;
}

async function byIdT<T extends DocumentBase>(id: string, tx: MSSQL): Promise<T | null> {
  const result = await byId(id, tx);
  if (result) return createDocument<T>(result.type, result); else return null;
}

async function createDoc<T extends DocumentBase>(type: DocTypes, document?: IFlatDocument): Promise<T> {
  return await createDocument<T>(type, document);
}

async function createDocServer<T extends DocumentBaseServer>(type: DocTypes, document: IFlatDocument | undefined, tx: MSSQL): Promise<T> {
  return await createDocumentServer<T>(type, document, tx);
}

async function createDocServerById<T extends DocumentBaseServer>(id: string, tx: MSSQL): Promise<T | null> {
  const flatDoc = await byId(id, tx);
  if (!flatDoc) return null;
  return await createDocServer<T>(flatDoc.type, flatDoc, tx);
}

async function saveDoc(servDoc: DocumentBaseServer, tx): Promise<DocumentBaseServer> {
  const savedVersion = await byId(servDoc.id, tx);
  const isPostedBefore = Type.isDocument(servDoc.type) && savedVersion && savedVersion.posted;
  const isPostedAfter = Type.isDocument(servDoc.type) && servDoc.posted;
  if (isPostedBefore) await unpostDocument(servDoc, tx);
  if (!servDoc.code) servDoc.code = await lib.doc.docPrefix(servDoc.type, tx);
  if (!servDoc.timestamp) servDoc = await insertDocument(servDoc, tx);
  else servDoc = await updateDocument(servDoc, tx);
  if (isPostedAfter) await postDocument(servDoc, tx);
  return servDoc;
}

async function findDocumentByProps<T>(
  type: CatalogTypes,
  propsFilter: { propKey: string, propValue: any }[],
  tx: MSSQL,
  options: {
    matching?: 'OR' | 'AND',
    selectedFields?: string[],
    first?: number,
    order?: string[],
    excludeDeleted?: boolean
  }): Promise<T[]> {

  if (!propsFilter.length) return [];

  const {
    matching = 'AND',
    selectedFields = ['id, description'],
    first = 0,
    order = ['description'],
    excludeDeleted = false
  } = options;

  const fieldsQ = selectedFields
    .map(e => `${e.trim()}`)
    .join(`, \n`);

  const filterQ = propsFilter
    .map(e => `${e.propKey} = @p${propsFilter.indexOf(e) + 1} `)
    .join(` ${matching} \n`);

  const orderQ = order
    .map(e => `${e} `)
    .join(`, \n`);

  const query = `
  SELECT DISTINCT ${first ? 'TOP ' + first : ''}
  ${fieldsQ}
  FROM[dbo].[${ type}.v]
  WHERE 1 = 1 AND
  ${excludeDeleted ? 'deleted = 0 AND' : ''}
  (${filterQ})
  ORDER BY ${ orderQ} `;

  return await tx.manyOrNone<T>(query, propsFilter.map(e => e.propValue));

}

async function isDocumentUsedInAccumulationWithPropValueById(docId: string, propValue: any, tx: MSSQL): Promise<boolean> {
  const query = `
  select TOP 1 id
  from Accumulation
  where contains(data, @p1) and contains(data, @p2)`;
  return !!(await tx.oneOrNone(query, [docId, propValue]));
}

async function Ancestors(id: string, tx: MSSQL, level?: number): Promise<{ id: Ref, parent: Ref, level: number }[] | Ref | null> {
  if (!id) return null;
  const query = `SELECT id, [parent.id] parent, levelUp as N'level' FROM dbo.[Ancestors](@p1) WHERE levelUp = @p2 or @p2 is NULL`;
  let result;
  if (level || level === 0) {
    result = await tx.oneOrNone<{ id: Ref, parent: Ref, level: number } | null>(query, [id, level]);
    if (result) result = result.id;
  } else {
    result = await tx.manyOrNone<{ id: Ref, parent: Ref, level: number } | null>(query, [id, null]);
  }
  return result;
}

async function Descendants(id: string, tx: MSSQL): Promise<{ id: Ref, parent: Ref }[] | null> {
  if (!id) return null;
  return await tx.manyOrNone<{ id: Ref, parent: Ref }>(`SELECT id, parent FROM dbo.[Descendants](@p1,'')`, [id]);

}

async function haveDescendants(id: string, tx: MSSQL): Promise<boolean> {
  if (!id) return false;
  const query = 'select top 1 id from Documents where parent = @p1';
  return !!(await tx.oneOrNone(query, [id]));
}

async function salaryCompanyByCompany(company: Ref, tx: MSSQL): Promise<string | null> {
  return await x100.util.salaryCompanyByCompany(company, tx);
}

function noSqlDocument(flatDoc: INoSqlDocument | DocumentBaseServer): INoSqlDocument | null {
  if (!flatDoc) throw new Error(`lib.noSqlDocument: source is null!`);
  const { id, date, type, code, description, company, user, posted, deleted, isfolder, parent, info, timestamp, ...doc } = flatDoc;
  return <INoSqlDocument>
    { id, date, type, code, description, company, user, posted, deleted, isfolder, parent, info, timestamp, doc };
}

function flatDocument(noSqldoc: INoSqlDocument): IFlatDocument {
  if (!noSqldoc) throw new Error(`lib.flatDocument: source is null!`);
  const { doc, ...header } = noSqldoc;
  const flatDoc = { ...header, ...doc };
  return flatDoc;
}

async function docPrefix(type: DocTypes, tx: MSSQL): Promise<string> {
  const metadata = configSchema.get(type);
  if (metadata && metadata.prefix) {
    const prefix = metadata.prefix;
    const queryText = `SELECT '${prefix}' + FORMAT((NEXT VALUE FOR "Sq.${type}"), '0000000000') result `;
    const result = await tx.oneOrNone<{ result: string }>(queryText);
    return result ? result.result : '';
  }
  return '';
}

async function formControlRef(id: Ref, tx: MSSQL): Promise<RefValue | null> {
  const result = await tx.oneOrNone<RefValue>(`
    SELECT "id", "code", "description" as "value", "type" FROM "Documents" WHERE id = @p1`, [id]);
  return result;
}

async function debit(account: Ref, date = new Date(), company: Ref, tx: MSSQL): Promise<number> {
  const result = await tx.oneOrNone<{ result: number }>(`
    SELECT SUM(sum) result FROM "Register.Account"
    WHERE dt = @p1 AND datetime <= @p2 AND company = @p3
  `, [account, date, company]);
  return result ? result.result : 0;
}

async function kredit(account: Ref, date = new Date(), company: Ref, tx: MSSQL): Promise<number> {
  const result = await tx.oneOrNone<{ result: number }>(`
    SELECT SUM(sum) result FROM "Register.Account"
    WHERE kt = @p1 AND datetime <= @p2 AND company = @p3
  `, [account, date, company]);
  return result ? result.result : 0;
}

async function balance(account: Ref, date = new Date(), company: Ref, tx: MSSQL): Promise<number> {
  const result = await tx.oneOrNone<{ result: number }>(`
  SELECT (SUM(u.dt) - SUM(u.kt)) result FROM (
      SELECT SUM(sum) dt, 0 kt
      FROM "Register.Account"
      WHERE dt = @p1 AND datetime <= @p2 AND company = @p3

      UNION ALL

      SELECT 0 dt, SUM(sum) kt
      FROM "Register.Account"
      WHERE kt = @p1 AND datetime <= @p2 AND company = @p3
  ) u`, [account, date, company]);
  return result ? result.result : 0;
}

async function registerBalance(type: RegisterAccumulationTypes, date = new Date(),
  resource: string[], analytics: { [key: string]: Ref }, tx: MSSQL): Promise<{ [x: string]: number }> {

  const addFields = (key) => `SUM("${key}") "${key}",\n`;
  let fields = ''; for (const el of resource) { fields += addFields(el); } fields = fields.slice(0, -2);

  const addWhere = (key) => `AND "${key}" = '${analytics[key]}'\n`;
  let where = ''; for (const el of resource) { where += addWhere(el); } where = where.slice(0, -2);

  const queryText = `
  SELECT ${fields}
  FROM "${type}"
  WHERE (1=1)
    AND date <= @p1
    ${where}
  `;

  const result = await tx.oneOrNone<any>(queryText, [date]);
  return (result ? result : {});
}

async function exchangeRate(date = new Date(), company: Ref, currency: Ref, tx: MSSQL): Promise<number> {

  const queryText = `
    SELECT TOP 1 CAST([Rate] AS FLOAT) / CASE WHEN [Mutiplicity] > 0 THEN [Mutiplicity] ELSE 1 END result
    FROM [Register.Info.ExchangeRates] WITH (NOEXPAND)
    WHERE (1=1)
      AND date <= @p1
      AND company = @p2
      AND [currency] = @p3
    ORDER BY date DESC`;
  const result = await tx.oneOrNone<{ result: number }>(queryText, [date, company, currency]);
  return result ? result.result : 1;
}

async function sliceLast<T extends RegisterInfo>(type: string, date = new Date(), company: Ref,
  analytics: { [key: string]: any }, tx: MSSQL) {

  const addWhere = (key: string) => `AND "${key}" = '${analytics[key]}' \n`;
  let where = ''; for (const el of Object.keys(analytics)) { where += addWhere(el); }

  const queryText = `
    SELECT TOP 1 * FROM [Register.Info.${type}] WITH (NOEXPAND)
    WHERE (1=1)
      AND date <= @p1
      AND company = @p2
      ${where}
    ORDER BY date DESC`;
  const result = await tx.oneOrNone<T>(queryText, [date, company]);
  return result;
}

export async function postById(id: Ref, tx: MSSQL) {
  await lib.util.adminMode(true, tx);
  try {
    const serverDoc = await setPostedSate(id, tx);
    await unpostDocument(serverDoc, tx);
    if (serverDoc.deleted === false) await postDocument(serverDoc, tx);
    return serverDoc;
  } catch (ex) { throw new Error(ex); }
  finally { await lib.util.adminMode(false, tx); }
}

export async function unPostById(id: Ref, tx: MSSQL) {
  await lib.util.adminMode(true, tx);
  try {
    const doc = (await lib.doc.byId(id, tx))!;
    const serverDoc = await createDocumentServer(doc.type as DocTypes, doc, tx);
    // if (!doc.posted) return serverDoc;
    serverDoc.posted = false;
    await unpostDocument(serverDoc, tx);
    await updateDocument(serverDoc, tx);
    return serverDoc;
  } catch (ex) { throw new Error(ex); }
  finally { await lib.util.adminMode(false, tx); }
}

function taskPoolTx(): MSSQL {
  return new MSSQL(TASKS_POOL,
    { email: 'service@service.com', isAdmin: true, description: 'service account', env: {}, roles: [] });
}

async function insertQueue(row: IQueueRow, taskPoolTX?: MSSQL): Promise<IQueueRow> {

  if (!row.date) row.date = new Date();
  if (!taskPoolTX) taskPoolTX = taskPoolTx();

  const query = `INSERT INTO [exc].[Queue]([type],[doc],[status],[ExchangeCode],[ExchangeBase],[Date],[id])
  VALUES (@p1, JSON_QUERY(@p2), @p3, @p4, @p5, @p6, @p7)`;

  if (!row.id) row.id = v1().toLocaleUpperCase();

  await taskPoolTX!.none(query,
    [row.type, row.doc, row.status, row.exchangeCode, row.exchangeBase, row.date, row.id]
  );

  return row;

}

async function updateQueue(row: IQueueRow, taskPoolTX?: MSSQL): Promise<IQueueRow> {

  if (!row.date) row.date = new Date();
  if (!taskPoolTX) taskPoolTX = taskPoolTx();

  const query = `UPDATE [exc].[Queue]
    SET
      [type] = @p1,
      [doc] = JSON_QUERY(@p2),
      [status] = @p3,
      [ExchangeCode] = @p4,
      [ExchangeBase] = @p5,
      [Date] = @p6 WHERE id = @p7`;

  if (!row.id) row.id = v1().toLocaleUpperCase();

  await taskPoolTX!.none(query,
    [row.type, row.doc, row.status, row.exchangeCode, row.exchangeBase, row.date, row.id]
  );

  return row;

}

async function deleteQueue(id: string, taskPoolTX?: MSSQL): Promise<void> {
  if (!taskPoolTX) taskPoolTX = taskPoolTx();
  const query = `DELETE FROM [exc].[Queue] WHERE id = @p1`;
  await taskPoolTX!.none(query, [id]);
}

async function getQueueById(id: string, taskPoolTX?: MSSQL): Promise<IQueueRow | null> {
  if (taskPoolTX) taskPoolTX = taskPoolTx();
  const query = `SELECT * FROM  [exc].[Queue] WHERE id = @p1`;
  return await taskPoolTX!.oneOrNone(query, [id]);
}

async function addAttachments(attachments: CatalogAttachment[], tx: MSSQL): Promise<any[]> {
  const keys = Object.keys(new CatalogAttachment);
  const result: any[] = [];
  let userId = '';
  const getCurrentUserIdByMail = async () => {
    return await byCode('Catalog.User', tx.user.email, tx);
  };
  for (const attachment of attachments) {
    if (!attachment.owner) throw new Error('Attachment owner is empty!');
    let ob;
    if (attachment.id) ob = await createDocServerById(attachment.id, tx);
    else {
      ob = await createDocServer<CatalogAttachment>('Catalog.Attachment', undefined, tx);
      if (!userId) userId = await getCurrentUserIdByMail() as string;
      ob.user = userId;
      ob.date = new Date;
      ob.company = (await byId(attachment.owner, tx))!.company;
    }
    Object.keys(attachment)
      .filter(e => keys.includes(e))
      .forEach(e => ob[e] = attachment[e]);

    ob = await saveDoc(ob, tx);
    const resOb = {
      ...attachment,
      timestamp: ob.timestamp,
      date: ob.date,
      user: ob.user,
      id: ob.id
    };
    if (!resOb['userDescription'] && resOb.user) resOb['userDescription'] = (await byId(resOb.user as string, tx))!.description;

    result.push(resOb);
  }
  return result;
}

async function delAttachments(attachmentsId: Ref[], tx: MSSQL): Promise<boolean> {
  for (const id of attachmentsId) {
    const ob = await createDocServerById<CatalogAttachment>(id as string, tx);
    if (!ob || ob.deleted) continue;
    ob.Storage = '';
    ob.deleted = true;
    await updateDocument(ob, tx);
  }
  return true;
}

async function getAttachmentsByOwner(ownerId: Ref, withDeleted: boolean, tx: MSSQL): Promise<CatalogAttachment[]> {
  const query = `
  SELECT
    attach.*,
    stor.Storage
FROM
    (
        SELECT
            a.id,
            a.description,
            a.timestamp,
            a.owner,
            a.date,
            a.AttachmentType,
            a.Tags,
            a.MIMEType,
            a.FileSize,
            a.FileName,
            us.description userDescription,
            at.description AttachmentTypeDescription,
            at.IconURL,
            at.StorageType,
            at.LoadDataOnInit
        FROM
            [Catalog.Attachment.v] a
            LEFT JOIN [Catalog.Attachment.Type.v] at ON a.AttachmentType = at.id
            LEFT JOIN [Catalog.User.v] us ON a.[user] = us.id
        WHERE
            a.owner = @p1
            ${withDeleted ? '' : 'and a.deleted = 0'}
    ) attach
    LEFT JOIN dbo.[Documents] doc
    CROSS APPLY OPENJSON (doc.doc, N'$') WITH (Storage NVARCHAR(MAX) N'$.Storage') stor ON attach.id = doc.id
    and attach.LoadDataOnInit = 1
ORDER BY
    attach.timestamp DESC`;
  return await tx.manyOrNone(query, [ownerId]);
}

async function getAttachmentStorageById(attachmentId: Ref, tx: MSSQL): Promise<string> {
  const query = `
  SELECT stor.Storage FROM dbo.[Documents] doc
    CROSS APPLY OPENJSON (doc.doc, N'$') WITH (Storage NVARCHAR(MAX) N'$.Storage') stor WHERE doc.id = @p1`;
  const res = await tx.oneOrNone<{ Storage: string }>(query, [attachmentId]);
  return res ? res.Storage : '';
}

async function getAttachmentsSettingsByOwner(ownerId: Ref, tx: MSSQL): Promise<IAttachmentsSettings[]> {
  const owner = await byId(ownerId as string, tx);
  if (!owner) return [];
  let query = `SELECT d.id AttachmentType,
      d.description AttachmentTypeDescription,
      JSON_VALUE(d.doc, N'$.StorageType')  StorageType,
      JSON_VALUE(d.doc, N'$.FileFilter')  FileFilter,
      JSON_VALUE(d.doc, N'$.MaxFileSize')  MaxFileSize,
      JSON_VALUE(d.doc, N'$.IconURL')  IconURL,
      JSON_VALUE(d.doc, N'$.Tags')  Tags
  FROM [dbo].[Documents] d

  where d.type = 'Catalog.Attachment.Type'
      and d.deleted = 0
      and JSON_VALUE(d.doc, N'$.AllDocuments') = 'true'
  UNION
  SELECT d.id AttachmentType,
      d.description AttachmentTypeDescription,
      JSON_VALUE(d.doc, N'$.StorageType') StorageType,
      JSON_VALUE(d.doc, N'$.FileFilter') FileFilter,
      JSON_VALUE(d.doc, N'$.MaxFileSize') MaxFileSize,
      JSON_VALUE(d.doc, N'$.IconURL')  IconURL,
      JSON_VALUE(d.doc, N'$.Tags')  Tags
  FROM [dbo].[Documents] d
  CROSS APPLY OPENJSON (d.doc, N'$.Owners')
  WITH (
      [OwnerType] VARCHAR(MAX)
  ) AS owners
  where d.type = 'Catalog.Attachment.Type'
      and d.deleted = 0
      and owners.[OwnerType] = @p1
  ORDER by AttachmentTypeDescription`;
  if (Type.isCatalog(owner.type)) query = query.replace('.AllDocuments', '.AllCatalogs');
  const qRes = await tx.manyOrNone(query, [owner.type]) as any[];
  if (!qRes.length) return [];
  return [...new Set(qRes.map(e => {
    return { ...e, Tags: [...new Set(e.Tags.split(';').map(tag => tag.trim()).filter(tag => tag))] };
  }))];

}


export async function movementsByDoc<T extends RegisterAccumulation>(type: RegisterAccumulationTypes, doc: Ref, tx: MSSQL) {
  const queryText = `
  SELECT * FROM [Accumulation] WHERE type = @p1 AND document = @p2`;
  return await tx.manyOrNone<T>(queryText, [type, doc]);
}

async function bankStatementUnloadById(docsID: string[], tx: MSSQL): Promise<string> {
  return await BankStatementUnloader.getBankStatementAsString(docsID, tx);
}

async function getUserRoles(user: CatalogUser): Promise<string[]> {
  return (await getUserPermissions(user)).Roles;
}

async function isRoleAvailable(role: string, user: CatalogUser): Promise<boolean> {
  return !!(await getUserPermissions(user)).Roles.filter(e => e === role).length;
}

async function closeMonth(company: Ref, date: Date, tx: MSSQL): Promise<void> {
  // const sdb = new MSSQL(TASKS_POOL, { email: '', isAdmin: true, env: {}, description: '', roles: []} );
  await tx.none(`
    EXEC [Invetory.Close.Month-MEM] @company = '${company}', @date = '${date.toJSON()}'`);
}

async function closeMonthErrors(company: Ref, date: Date, tx: MSSQL) {
  const result = await tx.manyOrNone<{ Storehouse: Ref, SKU: Ref, Cost: number }>(`
    SELECT q.*, Storehouse.Department Department FROM (
      SELECT Storehouse, SKU, SUM([Cost]) [Cost]
      FROM [dbo].[Register.Accumulation.Inventory] r
      WHERE date < DATEADD(DAY, 1, EOMONTH(@p1)) AND company = @p2
      GROUP BY Storehouse, SKU
      HAVING SUM([Qty]) = 0 AND SUM([Cost]) <> 0) q
    LEFT JOIN [Catalog.Storehouse.v] Storehouse WITH (NOEXPAND) ON Storehouse.id = q.Storehouse`, [date, company]);
  return result;
}

async function getObjectPropertyById(id: Ref, propPath: string, tx: MSSQL) {

  const isGUID = (val: string): boolean => {
    return val.length === 36 && val.split('-').length === 5 && val.split('-')[0].length === 8;
  };

  let curVal, result: any = null;
  let ob = await lib.doc.byId(id, tx);
  if (!ob) return result;
  const path = propPath.split('.');
  let i = 0;
  for (i = 0; i < path.length; i++) {
    if (!ob) break;
    curVal = ob[path[i]];
    if (curVal && isGUID(curVal.toString())) ob = await byId(curVal, tx);
    else ob = null;
  }
  if (i === path.length) result = curVal;
  if (result && isGUID(result.toString())) result = await byId(result, tx);
  return result;

}

function exchangeDB() {
  return new MSSQL(EXCHANGE_POOL);
}
