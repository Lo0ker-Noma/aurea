# Generates public/donate-qr.svg (QR, error correction H) in the style of the Primal QR.
# Usage: pip install segno && python scripts/gen-donate-qr.py [module_radius=0.48] [finder_radius=1.6]
import segno, sys
DATA='lightning:looker@lawallet.io'
r=float(sys.argv[1]) if len(sys.argv)>1 else 0.48
q=segno.make(DATA, error='h', micro=False, boost_error=False)
m=[[bool(v) for v in row] for row in q.matrix]
n=len(m); Q=2; S=n+2*Q
A=n-7  # alignment pattern centre (version 4)
FR=float(sys.argv[2]) if len(sys.argv)>2 else 1.9
def finder(x,y): return (x<7 and y<7) or (x>=n-7 and y<7) or (x<7 and y>=n-7) or (abs(x-A)<=2 and abs(y-A)<=2)
import os
c=(n-1)/2; R_LOGO=float(os.environ.get("RL","3.6"))
def in_logo(x,y): return (x-c)**2+(y-c)**2 <= (R_LOGO+0.2)**2
def dark(x,y): return 0<=x<n and 0<=y<n and m[y][x] and not finder(x,y) and not in_logo(x,y)
parts=[]
for y in range(n):
    for x in range(n):
        if not dark(x,y): continue
        X,Y=x+Q+0.5,y+Q+0.5
        parts.append(f'<circle cx="{X:g}" cy="{Y:g}" r="{r}"/>')
        if dark(x+1,y): parts.append(f'<rect x="{X:g}" y="{Y-r:g}" width="1" height="{2*r:g}"/>')
        if dark(x,y+1): parts.append(f'<rect x="{X-r:g}" y="{Y:g}" width="{2*r:g}" height="1"/>')
        if dark(x+1,y) and dark(x,y+1) and dark(x+1,y+1): parts.append(f'<rect x="{X:g}" y="{Y:g}" width="1" height="1"/>')
for fx,fy in [(0,0),(n-7,0),(0,n-7)]:
    X,Y=fx+Q,fy+Q
    parts.append(f'<rect x="{X+0.5:g}" y="{Y+0.5:g}" width="6" height="6" rx="{FR}" fill="none" stroke="#000" stroke-width="1"/>')
    parts.append(f'<rect x="{X+2:g}" y="{Y+2:g}" width="3" height="3" rx="{FR/2}"/>')
parts.append(f'<rect x="{A-2+Q+0.5:g}" y="{A-2+Q+0.5:g}" width="4" height="4" rx="1.1" fill="none" stroke="#000" stroke-width="1"/>')
parts.append(f'<rect x="{A+Q:g}" y="{A+Q:g}" width="1" height="1" rx="0.3"/>')
C=c+Q+0.5; LR=R_LOGO-0.55
if R_LOGO<=0: LR=0.01
parts.append(f'<circle cx="{C:g}" cy="{C:g}" r="{LR:g}"/>')
sc=LR*1.15/12
parts.append(f'<path d="M13.2 3L5.5 13.4h5.6L10 21l8-10.6h-5.7z" fill="#fff" stroke="#fff" stroke-width="0.6" stroke-linejoin="round" transform="translate({C-12*sc:g} {C-12*sc:g}) scale({sc:.4f})"/>')
svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S*16}" height="{S*16}"><title>{DATA}</title><rect width="{S}" height="{S}" fill="#fff"/><g fill="#000">'+''.join(parts)+'</g></svg>'
open('public/donate-qr.svg','w').write(svg)
print('v',q.version,'n',n,'bytes',len(svg))
