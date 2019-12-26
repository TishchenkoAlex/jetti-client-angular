import * as express from 'express';
import { NextFunction, Request, Response } from 'express';
import { dateReviverUTC } from '../fuctions/dateReviver';
import { SQLGenegator } from '../fuctions/SQLGenerator.MSSQL';
import { MSSQL } from '../mssql';
import { SDB } from './middleware/db-sessions';
import { createFormServer } from '../models/Forms/form.factory.server';
import { FormTypes } from '../models/Forms/form.types';
import { FormBase } from '../models/Forms/form';
import { User } from './user.settings';

export const router = express.Router();

async function buildViewModel(ServerDoc: FormBase, tx: MSSQL) {
  const viewModelQuery = SQLGenegator.QueryObjectFromJSON(ServerDoc.Props());
  const NoSqlDocument = JSON.stringify(ServerDoc);
  return await tx.oneOrNone<{ [key: string]: any }>(viewModelQuery, [NoSqlDocument]);
}

router.post('/form/:type/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sdb = SDB(req);
    const user = User(req);
    const doc: FormBase = JSON.parse(JSON.stringify(req.body), dateReviverUTC);
    doc.type = req.params.type as FormTypes;
    doc.user = user;
    const serverDoc = createFormServer(doc);
    await serverDoc.Execute();
    const view = await buildViewModel(serverDoc, sdb);
    res.json(view);
  } catch (err) { next(err); }
});

router.post('/form/:type/:method', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sdb = SDB(req);
    const user = User(req);
    const doc: FormBase = JSON.parse(JSON.stringify(req.body), dateReviverUTC);
    doc.type = req.params.type as FormTypes;
    doc.user = user;
    const serverDoc = createFormServer(doc);
    await serverDoc[req.params.method]();
    const view = await buildViewModel(serverDoc, sdb);
    res.json(view);
  } catch (err) { next(err); }
});
