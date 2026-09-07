import io,re,hashlib,base64,sys
P="/Users/deepak/Desktop/Deepak_Prajapati_portfolio.github.io/index.html"
src=io.open(P,"r",encoding="utf-8",newline="").read()
blocks=re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", src, re.S)
hashes=[]
for b in blocks:
    norm=b.replace("\r\n","\n")          # HTML parser normalises before hashing
    h="'sha256-"+base64.b64encode(hashlib.sha256(norm.encode()).digest()).decode()+"'"
    if h not in hashes: hashes.append(h)
old=re.search(r"script-src [^;]*;", src).group(0)
new="script-src 'self' " + " ".join(hashes) + ";"
if old==new:
    print("hashes unchanged"); sys.exit(0)
src=src.replace(old,new,1)
io.open(P,"w",encoding="utf-8",newline="").write(src)
print("inline scripts:",len(blocks),"| unique hashes:",len(hashes))
for h in hashes: print("   ",h)
print("bare LF:",src.count("\n")-src.count("\r\n"))
