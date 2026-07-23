const fs = require('fs');
const ts = require('typescript');
const files = ['src/App.tsx','src/BuyFlow.tsx','src/i18n.ts','tailwind.config.js'];
let bad = 0;
for (const f of files) {
  const code = fs.readFileSync(f,'utf8');
  const out = ts.transpileModule(code, { reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
  const syn = (out.diagnostics||[]).filter(d => d.category===1);
  if (syn.length===0) console.log(`${f}: OK (syntax valid)`);
  else { bad++; console.log(`${f}: ${syn.length} syntax error(s)`);
    for (const d of syn.slice(0,6)) {
      const pos = d.file && d.start!=null ? d.file.getLineAndCharacterOfPosition(d.start):null;
      console.log('  ', pos?`L${pos.line+1}:${pos.character+1}`:'', ts.flattenDiagnosticMessageText(d.messageText,'\n')); } }
}
console.log(bad? 'RESULT: FAIL':'RESULT: ALL OK');
