import fs from 'node:fs';import crypto from 'node:crypto';
const run=process.argv[2];
const L=f=>fs.readFileSync(run+'/'+f,'utf8').trim().split('\n').map(JSON.parse);
const ev=L('evidence.jsonl');const byPath=s=>ev.find(e=>e.locator.endsWith(s));
const pr=byPath('pricing.md'),app=byPath('app.html'),vi=byPath('huong-dan.md');
const now='2026-11-16T00:00:00.000Z';
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const artifacts={},evidence=[];
function add(id,base,kind,value,method,limits,src){
  const s=typeof value==='string'?value:JSON.stringify(value);
  const art=`evidence/${id}.${typeof value==='string'?'txt':'json'}`;
  artifacts[art]=s;
  evidence.push({evidenceId:id,itemId:base.itemId,method,collectedAt:now,locator:base.locator+' (reviewer-derived: '+kind+')',snapshotHash:sha(s),byteLength:Buffer.byteLength(s),redaction:'none; synthetic content',limitations:limits,kind,value,artifact:art,encoding:typeof value==='string'?'utf8':'json',sourceEvidenceIds:src});
}
const aud='Audience per audit brief: content editors working on a synthetic offline export with English and Vietnamese content. No live-site, analytics or user-research data supplied.';
const claimPr='Supplied policy section of pricing.md (same file): "Effective 2026-10-01. United States monthly price: $29 before applicable taxes. Storage: 100 GB. Other markets and annual terms are not supplied." Contradicts "Customer draft": "The plan costs $19 per month worldwide and includes unlimited storage."';
const lim=['Derived by reviewer from the cited snapshot and the audit brief; not independent verification of the real-world policy'];
add('rev-aud-pricing',pr,'audience-context',aud,'reviewer-derivation',lim,[pr.evidenceId]);
add('rev-aud-vi',vi,'audience-context',aud,'reviewer-derivation',lim,[vi.evidenceId]);
add('rev-aud-app',app,'audience-context',aud,'reviewer-derivation',lim,[app.evidenceId]);
add('rev-claims-pricing',pr,'claim-sources',claimPr,'reviewer-derivation',lim,[pr.evidenceId]);
const rv=(item,ruleId,status,reason,ids)=>({itemId:item.itemId,ruleId,status,reason,evidenceIds:ids,reviewer:'Claude (audit host)',reviewedAt:now});
const reviews=[
 rv(pr,'quality-claims','fail','The "Customer draft" states $19/month worldwide with unlimited storage; the supplied policy in the same file states US-only $29/month before taxes and 100 GB effective 2026-10-01, with other markets not supplied.',[pr.evidenceId,'rev-claims-pricing']),
 rv(app,'seo-metadata','fail','Raw source has a generic title ("Example app") and no meta description or visible body text (empty div#root populated by a script). Rendered DOM was not available, so this is a source-level observation only.',[app.evidenceId,'rev-aud-app']),
 rv(vi,'quality-task-fit','pass','Page gives concrete steps (login, Dữ liệu section, Xuất CSV, download) and states limits (no attachments export, no processing-time commitment) matching the export task; fit to real users unverified.',[vi.evidenceId,'rev-aud-vi']),
];
const findings=[
 {findingId:'F-001',title:'Pricing draft contradicts supplied policy (price, region, storage)',affectedItemIds:[pr.itemId],ruleIds:['quality-claims'],dimensions:['quality'],evidenceIds:[pr.evidenceId,'rev-claims-pricing'],classification:'observed',severity:'high',confidence:'high',remediation:'Replace the Customer draft with policy-supported wording: US monthly price $29 before applicable taxes, 100 GB storage, effective 2026-10-01; state that other markets and annual terms are not yet supplied rather than claiming "worldwide" or "unlimited".',verification:'Re-read pricing.md and confirm every price, region and storage statement appears in the Supplied policy section; have the pricing owner confirm.',ownerRole:'content editor with pricing owner',effort:'small'},
 {findingId:'F-002',title:'app.html has no crawlable text or descriptive metadata in source HTML',affectedItemIds:[app.itemId],ruleIds:['seo-metadata'],dimensions:['seo'],evidenceIds:[app.evidenceId,'rev-aud-app'],classification:'observed',severity:'medium',confidence:'medium',remediation:'Provide a descriptive title, meta description and server-delivered primary text (or confirm via rendering that equivalent content exists). Rendering behaviour remains unverified here.',verification:'Fetch the raw HTML and rendered DOM of the live page and confirm title, description and main content are present; Search Console URL Inspection if available.',ownerRole:'web developer',effort:'medium'},
];
fs.writeFileSync(process.argv[3],JSON.stringify({reviews,evidence,artifacts,findings},null,2));
