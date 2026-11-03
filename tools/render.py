"""Gera as imagens do manual com as peças reais. Uso: servir o site em :8123 e rodar este script."""
import asyncio,base64,io,sys
from PIL import Image,ImageDraw,ImageFont
from playwright.async_api import async_playwright
OUT='manual/';F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',21)
def dec(u): return Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB')
def label(im,ls):
    d=ImageDraw.Draw(im)
    for l in ls:
        b=d.textbbox((0,0),l['txt'],font=F);w=b[2]+18;x=max(4,min(im.width-w-4,l['x']-w/2));y=max(4,min(im.height-36,l['y']-30))
        d.rounded_rectangle([x,y,x+w,y+32],7,fill=(25,24,33));d.text((x+9,y+4),l['txt'],font=F,fill=(255,235,205))
    return im
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']);c=await b.new_context(viewport={'width':400,'height':860});pg=await c.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('http://localhost:8123/');await pg.wait_for_timeout(1500)
    await pg.add_script_tag(url='vendor/three.min.js');await pg.add_script_tag(path='tools/render-scene.js');await pg.wait_for_timeout(300)
    await pg.evaluate("(()=>{const t=Sombra.tree(),n=Sombra.N,c=document.createElement('canvas');c.width=c.height=n;const x=c.getContext('2d'),d=x.createImageData(n,n);for(let i=0;i<n*n;i++){const v=t[i]?0:255;d.data[i*4]=d.data[i*4+1]=d.data[i*4+2]=v;d.data[i*4+3]=255}x.putImageData(d,0,0);art.bmp=c;artMask()})()")
    for n in sys.argv[1:] or ['pecas','externos','tubo','tampo','caixa','fechar','paineis','pronta','traseira','parede']:
      r=await pg.evaluate(f"Shots.{n}()");im=label(dec(r['url']),r['labels']);im.save(OUT+n+'.webp',quality=82);print(n,im.size)
    fr=[]
    for i in range(30):
      k=min(1,i/22);a=.5*max(0,(i-22))/7
      r=await pg.evaluate(f"Shots.frame({k},{a})");fr.append(dec(r['url']).resize((560,420),Image.LANCZOS))
    fr=fr+[fr[-1]]*6
    pal=fr[12].quantize(96,method=Image.MEDIANCUT);q=[f.quantize(palette=pal,dither=Image.NONE) for f in fr]
    q[0].save(OUT+'montagem.gif',save_all=True,append_images=q[1:],duration=110,loop=0,optimize=True)
    print(errs);await b.close()
asyncio.run(main())
