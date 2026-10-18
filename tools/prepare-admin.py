"""One-time import of the existing static site's editable content."""
from pathlib import Path
from html.parser import HTMLParser
import json, re, sys

ROOT = Path(__file__).resolve().parents[1]
seed_path = ROOT / 'admin/seed.json'
refresh = '--refresh' in sys.argv
if refresh and (ROOT/'.admin/state.json').exists():
    raise SystemExit('Refusing to reimport after private dashboard data has been saved.')
if seed_path.exists() and not refresh:
    raise SystemExit('Admin seed already exists; refusing to overwrite imported content.')

class Importer(HTMLParser):
    def __init__(self, source, page):
        super().__init__(convert_charrefs=True)
        self.source, self.page = source, page
        self.lines = [0]
        for match in re.finditer('\n', source): self.lines.append(match.end())
        self.stack, self.sections, self.edits = [], [], []
        self.counter = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        raw = self.get_starttag_text()
        start = self.lines[self.getpos()[0]-1] + self.getpos()[1]
        parent = next((item['section'] for item in reversed(self.stack) if item.get('section')), None)
        section = parent
        extra = ''
        is_section = tag == 'section' or tag == 'footer' or tag == 'header' and 'site-header' in attrs.get('class', '') or tag == 'article' and 'detail-article' in attrs.get('class','')
        if is_section and not parent:
            key = f'{self.page}-section-{len(self.sections)+1}'
            section = dict(id=key, label=attrs.get('aria-label') or attrs.get('class',tag).split()[0].replace('-',' ').title(), fields=[], hidden=False, locked=tag in ('header','footer'))
            self.sections.append(section)
            extra += f' data-cms-section="{key}"'
        fields = []
        if section and tag in ('h1','h2','h3','h4','p','a','button','img') and not any(item['tag'] in ('script','style','svg') for item in self.stack):
            self.counter += 1
            key = f'{self.page}-field-{self.counter}'
            extra += f' data-cms-key="{key}"'
            if tag == 'img':
                for attribute, label in [('src','Image'),('alt','Image description')]:
                    value = attrs.get(attribute, '')
                    fields.append(dict(id=key+'-'+attribute, key=key, type='image' if attribute=='src' else 'text', attribute=attribute, label=label, value=value, default=value))
            else:
                fields.append(dict(id=key+'-text', key=key, type='text', attribute='text', label=tag.upper(), value='', default=''))
                if tag == 'a':
                    value = attrs.get('href','')
                    fields.append(dict(id=key+'-href', key=key, type='link', attribute='href', label='Destination', value=value, default=value))
            section['fields'].extend(fields)
        if extra:
            pos = start + len(raw) - (2 if raw.endswith('/>') else 1)
            self.edits.append((pos, extra))
        item = dict(tag=tag,section=section,fields=fields,text='')
        if tag not in ('img','meta','link','br','input','hr','source','wbr','area','base','col','embed','param','track'):
            self.stack.append(item)
    def handle_data(self, data):
        if any(item['tag'] in ('script','style','svg') for item in self.stack): return
        for item in self.stack:
            if item['fields']: item['text'] += data
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i]['tag'] == tag:
                for item in self.stack[i:]:
                    for field in item['fields']:
                        if field['attribute']=='text':
                            field['value']=field['default']=' '.join(item['text'].split())
                            field['label']=f"{item['tag'].upper()}: {field['value'][:48]}"
                            if item['tag'] in ('h1','h2') and item['section'] and not item['section'].get('heading'):
                                item['section']['label']=field['value'][:65]
                                item['section']['heading']=True
                self.stack=self.stack[:i]
                break

pages=[]
for path in list(ROOT.glob('*.html')) + list((ROOT/'projects').glob('*.html')):
    source=path.read_text(encoding='utf-8')
    if refresh:
        source=re.sub(r' data-cms-(?:key|section)="[^"]*"','',source)
        source=re.sub(r'<script src="(?:\.\./)?(?:admin/content\.js|Javascript/cms\.js)" defer></script>\n?','',source)
    page=path.stem.lower() if path.parent==ROOT else 'project-'+path.stem.lower()
    parser=Importer(source,page);parser.feed(source)
    for section in parser.sections:
        section['fields']=[field for field in section['fields'] if field['attribute']!='text' or field['default']]
        section.pop('heading',None)
    for pos, extra in reversed(parser.edits): source=source[:pos]+extra+source[pos:]
    prefix='' if path.parent==ROOT else '../'
    source=source.replace('</head>',f'<script src="{prefix}admin/content.js" defer></script>\n</head>')
    source=source.replace('</body>',f'<script src="{prefix}Javascript/cms.js" defer></script>\n</body>')
    path.write_text(source,encoding='utf-8')
    title=re.search(r'<title>(.*?)</title>',source,re.S)
    pages.append(dict(id=page,file=path.relative_to(ROOT).as_posix(),title=title[1].split('|')[0].strip() if title else page,sections=parser.sections))

seed=dict(pages=pages, theme=dict(primary='#176147',yellow='#ffd44f',text='#193d31',background='#ffffff'),
    navigation=[dict(id=key,label=label,url=file) for key,label,file in [('home','Home','index.html'),('story','Our story','about.html'),('projects','Our projects','projects.html'),('gallery','Gallery','gallery.html'),('shop','Shop','shop.html'),('contact','Contact','contact.html')]],
    event=dict(title='Annual School Supplies Drive & Mentorship Day',start='2027-01-01T08:00:00Z',end='2027-01-01T23:59:59Z',location='Anyirawase D/A JHS, Volta Region, Ghana',flyer='images/Anyirawase.jpg',category='School support'),
    timing=dict(hero=4500,circles=3500,testimonials=4000), media=[],
    products=[dict(id=key,name=name,price=price) for key,name,price in [('tshirt','Organic T-Shirt',45),('tote','Canvas Tote Bag',35),('cap','Branded Cap',30),('notebooks','Notebook Set (3x)',28),('mug','Mission Coffee Mug',25),('wristbands','Wristband Set (5x)',20),('hoodie','Cozy Hoodie',65),('bottle','Eco Water Bottle',50)]])
images=ROOT/'images'
for path in images.rglob('*'):
    if path.is_file() and path.suffix.lower() in ('.jpg','.jpeg','.png','.webp'):
        seed['media'].append(dict(id=path.relative_to(ROOT).as_posix(),url=path.relative_to(ROOT).as_posix(),alt=path.stem,folder='Website images'))
seed_path.write_text(json.dumps(seed,indent=2,ensure_ascii=False),encoding='utf-8')
print(f'Imported {len(pages)} pages and {len(seed["media"])} images.')
