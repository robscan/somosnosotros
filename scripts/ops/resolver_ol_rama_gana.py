import subprocess,re,sys
g=lambda r:subprocess.run(['git','show',r+':docs/ops/OPEN_LOOPS.md'],capture_output=True,text=True).stdout
base=subprocess.run(['git','merge-base','HEAD','origin/main'],capture_output=True,text=True).stdout.strip()
B,R,M=g(base),g('HEAD'),g('origin/main'); P='**Last updated:** '
cab=lambda t:[l for l in t.splitlines() if l.startswith(P)][0][len(P):]
cb,cr,cm=cab(B),cab(R),cab(M); assert cr.endswith(cb)
nuevo=cr[:len(cr)-len(cb)]; out=M.replace(P+cm,P+nuevo+cm,1)
bs=set(B.splitlines()); n=0
for l in R.splitlines():
    if l in bs or l.startswith(P): continue
    m=re.match(r'- \*\*(OL-\d+[a-z]?) ·',l)
    if not m: continue
    viejas=[x for x in out.splitlines() if x.startswith('- **'+m.group(1)+' ·')]
    assert len(viejas)==1, (m.group(1),len(viejas))
    out=out.replace(viejas[0],l,1); n+=1
open('docs/ops/OPEN_LOOPS.md','w',encoding='utf-8').write(out)
print('trozos rama:',nuevo.count('; antes, '),'| entradas sustituidas (rama gana):',n,'| marcas:',out.count('<<<<<<<'))
assert out.count('<<<<<<<')==0
