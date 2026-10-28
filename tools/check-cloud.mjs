import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {cloudRepository} from '../admin/server/cloud-repository.mjs';
// Check setup without printing credentials or individual member/account records.
const repo=cloudRepository();if(!repo)throw new Error('Supabase server settings are missing.');
const cloud=await repo.load();
if(!cloud.payload.users?.some(user=>user.role==='Owner'))throw new Error('Migrated CMS has no owner.');
console.log('Cloud CMS ready. Pages:',cloud.payload.draft.pages.length,'Accounts:',cloud.payload.users.length);
console.log('Verification photo lookup responds:',await repo.publicPhoto('0'.repeat(64))===null);
