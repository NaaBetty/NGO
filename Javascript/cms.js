(() => {
  const original = new Map([...document.querySelectorAll('[data-cms-key]')].map(node => [node.dataset.cmsKey,{node,html:node.innerHTML,href:node.getAttribute('href'),src:node.getAttribute('src'),alt:node.getAttribute('alt')}]));
  const sections = new Map([...document.querySelectorAll('[data-cms-section]')].map(node=>[node.dataset.cmsSection,node]));
  const preview = new URLSearchParams(location.search).has('cms-preview');
  let overrideObserver;
  const styledNodes=new Map();
  const shopTemplate=document.querySelector('.product-card')?.cloneNode(true);
  const asset = value => {
    if (!value || /^(?:[a-z]+:|\/|#)/i.test(value)) return value;
    return value.startsWith('../') ? value : new URL(value, new URL(location.pathname.includes('/projects/')?'../':'./',location.href)).href;
  };
  function apply(content) {
    if(!content)return;
    overrideObserver?.disconnect();
    const overrides=[];
    styledNodes.forEach((style,node)=>{if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);});styledNodes.clear();
    const file=decodeURIComponent(location.pathname).replace(/^\//,'')||'index.html';
    const page=content.pages.find(page=>page.file===file);
    document.querySelectorAll('[data-cms-created]').forEach(node=>node.remove());
    original.forEach(({node,html,href,src,alt})=>{
      if(node.tagName!=='IMG')node.innerHTML=html;
      for(const [name,value]of Object.entries({href,src,alt}))if(value!==null)node.setAttribute(name,value);
    });
    for(const [name,value]of Object.entries(content.theme||{}))document.documentElement.style.setProperty(({primary:'--primary',yellow:'--sunflower',text:'--dark',background:'--paper'})[name],value);
    if(page){
      const markers=new Map();
      sections.forEach(node=>{
        if(node.matches('.site-header,footer')){node.hidden=false;return;}
        node.hidden=true;const parent=node.parentNode;
        if(!markers.has(parent)){const marker=document.createComment('Managed sections');parent.insertBefore(marker,node);markers.set(parent,marker);}
      });
      for(const section of page.sections){
        let node=sections.get(section.sourceId||section.id);
        if(section.custom){
          node=document.createElement('section');node.dataset.cmsCreated='true';node.className='cms-custom-section';node.dataset.cmsSection=section.id;
          if(section.image){const image=document.createElement('img');image.src=asset(section.image);image.alt=section.imageAlt||'';node.append(image);}
          const heading=document.createElement('h2');heading.textContent=section.title||'';const description=document.createElement('p');description.textContent=section.description||'';node.append(heading,description);
          if(section.buttonLabel){const button=document.createElement('a');button.textContent=section.buttonLabel;button.href=asset(section.buttonUrl||'#');button.className='solid-link';node.append(button);}
          (document.querySelector('main')||document.body).append(node);
        }else if(node&&section.sourceId){node=node.cloneNode(true);node.dataset.cmsCreated='true';node.dataset.cmsSection=section.id;}
        if(!node)continue;
        node.hidden=!!section.hidden;
        if(!section.custom){
          const parent=sections.get(section.sourceId||section.id).parentNode;
          if(!node.matches('.site-header,footer'))parent.insertBefore(node,markers.get(parent));
          for(const field of section.fields||[]){
            if(field.value===field.default)continue;
            const target=node.matches(`[data-cms-key="${field.key}"]`)?node:node.querySelector(`[data-cms-key="${field.key}"]`);
            if(!target)continue;
            if(field.attribute==='text')target.textContent=field.value;
            else target.setAttribute(field.attribute,field.attribute==='src'?asset(field.value):field.value);
            overrides.push({target,field});
          }
        }
      }
      markers.forEach(marker=>marker.remove());
    }
    if(content.navigation){
      document.querySelectorAll('.desktop-links').forEach(nav=>{
        nav.replaceChildren(...content.navigation.map(item=>{
          const link=document.createElement('a');link.className='nav-link';link.textContent=item.label;link.href=asset(item.url);
          if(new URL(link.href).pathname===location.pathname){link.classList.add('active');link.setAttribute('aria-current','page');}
          return link;
        }));
      });
      const menu=document.getElementById('mobile-menu');
      if(menu){
        const oldLinks=[...menu.querySelectorAll('a')].filter(link=>!link.getAttribute('href')?.includes('donate.html'));
        const container=oldLinks[0]?.parentNode;
        if(container){
          const marker=document.createComment('Mobile navigation');container.insertBefore(marker,oldLinks[0]);oldLinks.forEach(link=>link.remove());
          for(const item of content.navigation){const link=document.createElement('a');link.href=asset(item.url);link.textContent=item.label;link.className='nav-link block text-2xl';container.insertBefore(link,marker);}
          marker.remove();
        }
      }
    }
    const event=content.event;
    if(event){
      const timer=document.querySelector('[data-event-start]');
      if(timer){timer.dataset.eventStart=event.start;timer.dataset.eventEnd=event.end;}
      const title=document.getElementById('upcoming-title');if(title)title.textContent=event.title;
      document.querySelectorAll('.project-flyer img,#flyer-modal>img').forEach(image=>{image.src=asset(event.flyer);});
      const date=document.querySelector('.event-meta time');if(date){date.dateTime=event.start;date.textContent=new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeStyle:'short',timeZone:'UTC'}).format(new Date(event.start))+' GMT';}
      const locationNode=document.querySelector('.event-summary-copy .event-meta:last-child');if(locationNode)locationNode.textContent=event.location;
    }
    const grid=document.querySelector('.merch-grid');
    if(grid&&Array.isArray(content.products)){
      const templates=new Map([...grid.querySelectorAll('.product-card')].map(card=>[card.querySelector('[data-product]')?.dataset.product,card]));
      const fallback=grid.querySelector('.product-card')||shopTemplate;
      const cards=content.products.map(product=>{
        const existing=templates.get(product.id);
        const card=(existing||fallback).cloneNode(true);
        if(!existing){card.querySelectorAll('[data-cms-key]').forEach(node=>node.removeAttribute('data-cms-key'));card.querySelector('.product-sizes')?.remove();}
        const category=product.category||({apparel:'Apparel',accessories:'Accessories',home:'Home & Gifts'}[[...card.classList].find(c=>['apparel','accessories','home'].includes(c))]||'Apparel');
        card.className='product-card';card.dataset.shopCategory=category;card.style.display='';
        card.querySelector('h3').textContent=product.name;
        card.querySelector('.product-price').textContent='GHS '+product.price.toFixed(2);
        if(product.description!==undefined)card.querySelector('.product-description').textContent=product.description;
        const button=card.querySelector('.add-to-cart');button.dataset.product=product.id;button.dataset.name=product.name;button.dataset.price=product.price;
        if(Array.isArray(product.colors)){
          const container=card.querySelector('.product-colours');
          container?.replaceChildren(...product.colors.map((color,index)=>{
            const swatch=document.createElement('button');swatch.type='button';swatch.className='color-swatch'+(index===0?' selected':'');
            swatch.style.setProperty('--swatch',color.hex);swatch.dataset.color=color.name;swatch.title=color.name;swatch.setAttribute('aria-label',color.name+' color');swatch.setAttribute('aria-pressed',String(index===0));
            swatch.dataset.photo=asset(color.image||product.image||'');swatch.dataset.photoAlt=color.alt||product.imageAlt||product.name+' - '+color.name;return swatch;
          }));
        }
        const image=card.querySelector('[data-product-photo]'),placeholder=card.querySelector('.product-photo-placeholder');
        const selectedColor=product.colors?.[0];
        const photo=selectedColor?.image||(product.image!==undefined?product.image:image?.getAttribute('src'));
        if(image){
          const show=()=>{image.hidden=false;if(placeholder)placeholder.hidden=true;};
          const hide=()=>{image.hidden=true;if(placeholder)placeholder.hidden=false;};
          image.onload=show;image.onerror=hide;hide();
          image.alt=selectedColor?.alt||product.imageAlt||product.name;
          if(photo){image.src=asset(photo);if(image.complete&&image.naturalWidth)show();}else image.removeAttribute('src');
        }
        return card;
      });
      grid.replaceChildren(...cards);
      const filters=document.querySelector('.shop-filters');
      if(filters)filters.replaceChildren(...['all',...new Set(cards.map(card=>card.dataset.shopCategory))].map(category=>{
        const button=document.createElement('button');button.type='button';button.className='category-btn'+(category==='all'?' active':'');button.dataset.category=category;button.setAttribute('aria-pressed',String(category==='all'));button.textContent=category==='all'?'All Items':category;return button;
      }));
      window.dispatchEvent(new CustomEvent('leshelter-products',{detail:content.products}));
    }
    const decorate=(node,key)=>{
      const style=content.textStyles?.[key];if(!node||!style)return;
      if(!styledNodes.has(node))styledNodes.set(node,node.getAttribute('style'));
      for(const [property,value]of Object.entries(style))if(['color','fontSize','fontFamily','fontWeight','fontStyle','textAlign','textDecoration'].includes(property))node.style[property]=property==='fontSize'?value+'px':value;
    };
    if(page)for(const section of page.sections){
      const root=document.querySelector(`[data-cms-section="${section.id}"]`);
      if(section.custom){
        const custom=[...document.querySelectorAll('.cms-custom-section')].find(node=>node.dataset.cmsSection===section.id);
        for(const [property,selector]of Object.entries({title:'h2',description:'p',buttonLabel:'a'}))decorate(custom?.querySelector(selector),['pages',page.id,section.id,property].join('.'));
      }else for(const field of section.fields||[])if(field.attribute==='text')decorate(root?.querySelector(`[data-cms-key="${field.key}"]`),['pages',page.id,section.id,field.id].join('.'));
    }
    for(const product of content.products||[]){
      const card=document.querySelector(`.add-to-cart[data-product="${product.id}"]`)?.closest('.product-card');
      decorate(card?.querySelector('h3'),'products.'+product.id+'.name');
      decorate(card?.querySelector('.product-description'),'products.'+product.id+'.description');
      document.querySelectorAll('.category-btn').forEach(node=>{if(node.dataset.category===product.category)decorate(node,'products.'+product.id+'.category');});
    }
    (content.navigation||[]).forEach((item,index)=>document.querySelectorAll('.desktop-links,#mobile-menu').forEach(nav=>decorate(nav.querySelectorAll('a.nav-link')[index],'navigation.'+item.id+'.label')));
    decorate(document.getElementById('upcoming-title'),'event.title');
    decorate(document.querySelector('.event-summary-copy .event-meta:last-child'),'event.location');
    window.LE_SHELTER_CONTENT=content;
    if(overrides.length){
      overrideObserver=new MutationObserver(()=>{
        for(const {target,field}of overrides){
          if(field.attribute==='text'){if(target.textContent!==field.value)target.textContent=field.value;}
          else{const value=field.attribute==='src'?asset(field.value):field.value;if(target.getAttribute(field.attribute)!==value)target.setAttribute(field.attribute,value);}
        }
      });
      overrideObserver.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['src','href','alt']});
    }
  }
  if(preview){
    document.addEventListener('submit',event=>event.preventDefault(),true);
    document.addEventListener('click',event=>{if(event.target.closest('a,button')){event.preventDefault();event.stopImmediatePropagation();}},true);
    window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='leshelter-preview')apply(event.data.content);});
    parent.postMessage({type:'leshelter-preview-ready'},location.origin);
  }else apply(window.LE_SHELTER_CONTENT);
})();
