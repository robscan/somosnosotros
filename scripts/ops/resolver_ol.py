import subprocess,re
g=lambda r:subprocess.run(['git','show',r+':docs/ops/OPEN_LOOPS.md'],capture_output=True,text=True).stdout
base=subprocess.run(['git','merge-base','HEAD','origin/main'],capture_output=True,text=True).stdout.strip()
P='**Last updated:** '; B,R,M=g(base),g('HEAD'),g('origin/main')
# La cabecera puede venir partida en varias líneas (un operador la envolvió a 120 columnas): se toma el párrafo
# entero, desde «**Last updated:**» hasta la primera línea en blanco, unido en una sola línea.
def cab(t):
    ls=t.splitlines(); i=next(k for k,l in enumerate(ls) if l.startswith(P)); j=i
    while j+1<len(ls) and ls[j+1].strip(): j+=1
    return ' '.join(l.strip() for l in ls[i:j+1])[len(P):]
def sin_partir(t):
    ls=t.splitlines(keepends=True); i=next(k for k,l in enumerate(ls) if l.startswith(P)); j=i
    while j+1<len(ls) and ls[j+1].strip(): j+=1
    return ''.join(ls[:i])+P+cab(t)+'\n'+''.join(ls[j+1:])
B,R,M=sin_partir(B),sin_partir(R),sin_partir(M)
cb,cr,cm=cab(B),cab(R),cab(M); S='; antes, '; assert cr.endswith(cb)
# main puede haber reordenado trozos viejos (uniones anteriores); basta con que conserve todos los de la base.
faltan_cab=[t for t in cb.split(S) if t not in set(cm.split(S))]; assert not faltan_cab, faltan_cab[:2]
nuevo=cr[:len(cr)-len(cb)]; bs=set(B.splitlines())
lr=[l for l in R.splitlines() if l not in bs and not l.startswith(P)]
# Las líneas nuevas que empiezan por fecha son de «Decidido»; el resto, entradas de «Ahora».
dec=[l for l in lr if re.match(r'- \*\*\d{4}-\d{2}-\d{2} ·',l)]; aho=[l for l in lr if l not in dec]
out=M.replace(P+cm,P+nuevo+cm,1); d='## Decidido\n'; assert out.count('## Ahora\n')==1 and out.count(d)==1
# «## Ahora» puede ir seguido de una línea en blanco o directamente de la primera entrada (un operador la pegó sin blanco).
a='## Ahora\n\n' if '## Ahora\n\n' in out else '## Ahora\n'
# Una entrada de «Ahora» cuyo OL ya existe en main la SUSTITUYE (parte de la más larga) y conserva el sufijo «En producción» de main.
marca=' **En producción (gestión de cambios'; sust=set()
for l in list(aho):
    m=re.match(r'- \*\*(OL-\d+[a-z]?) ·',l)
    if not m: continue
    viejas=[x for x in out.splitlines() if x.startswith('- **'+m.group(1)+' ·')]
    if len(viejas)==1:
        v=viejas[0]; suf=v[v.index(marca):] if marca in v else ''
        mejor=l if len(l)>=len(v)-len(suf) else v[:len(v)-len(suf)]
        out=out.replace(v,mejor+(suf if suf and suf not in mejor else ''),1); aho.remove(l); bs.add(v); sust.add(v) if mejor==l else None
out=out.replace(a,a+''.join(l+'\n' for l in aho),1).replace(d,d+''.join(l+'\n' for l in dec),1)
open('docs/ops/OPEN_LOOPS.md','w',encoding='utf-8').write(out)
o=set(out.splitlines())
fm=[l for l in M.splitlines() if l.strip() and l not in o and not l.startswith(P) and l not in sust]
for v in sust: print('sustituida en main:',v[:70],'…(',len(v),'car.)')
# De la rama solo puede faltar lo que ya estaba en la base y main reescribió (p. ej. una entrada a la que se añadió «En producción»).
fr=[l for l in R.splitlines() if l.strip() and l not in o and not l.startswith(P) and l not in bs and not any(x.startswith(l) for x in o)]
print('trozos rama:',nuevo.count('; antes, '),'| a Ahora:',len(aho),'a Decidido:',len(dec),'| faltan main:',len(fm),'rama:',len(fr),'| marcas:',out.count('<<<<<<<'))
assert not fm and not fr and out.count('<<<<<<<')==0
