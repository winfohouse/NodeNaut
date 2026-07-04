(function(){var MessageType=function(e){return e.WORKFLOW_START=`WORKFLOW_START`,e.WORKFLOW_STOP=`WORKFLOW_STOP`,e.WORKFLOW_PAUSE=`WORKFLOW_PAUSE`,e.WORKFLOW_RESUME=`WORKFLOW_RESUME`,e.WORKFLOW_STEP=`WORKFLOW_STEP`,e.VAULT_CHALLENGE=`VAULT_CHALLENGE`,e.VAULT_UNLOCKED=`VAULT_UNLOCKED`,e.STEP_STARTED=`STEP_STARTED`,e.STEP_COMPLETED=`STEP_COMPLETED`,e.STEP_FAILED=`STEP_FAILED`,e.DOM_FILL=`DOM_FILL`,e.DOM_CLICK=`DOM_CLICK`,e.DOM_SCAN=`DOM_SCAN`,e.DOM_SCRIPT=`DOM_SCRIPT`,e.DOM_HIGHLIGHT=`DOM_HIGHLIGHT`,e.DOM_INTERACT=`DOM_INTERACT`,e.DOM_EVAL=`DOM_EVAL`,e.DOM_WAIT_STABILITY=`DOM_WAIT_STABILITY`,e.DOM_GET_SPEC=`DOM_GET_SPEC`,e.HUD_UPDATE=`HUD_UPDATE`,e.HUD_WAIT=`HUD_WAIT`,e.HUD_RESUME=`HUD_RESUME`,e.RECORDER_START=`RECORDER_START`,e.RECORDER_STOP=`RECORDER_STOP`,e.RECORDER_EVENT=`RECORDER_EVENT`,e.LOG_CREATE=`LOG_CREATE`,e.STATE_UPDATED=`STATE_UPDATED`,e.IPC_PING=`IPC_PING`,e.SPA_NAVIGATED=`SPA_NAVIGATED`,e.NAVIGATE=`NAVIGATE`,e.PICKER_START=`PICKER_START`,e.PICKER_STOP=`PICKER_STOP`,e.PICKER_SELECT=`PICKER_SELECT`,e.TEST_NODE=`TEST_NODE`,e}({}),FieldType=function(e){return e.TEXT=`TEXT`,e.PASSWORD=`PASSWORD`,e.EMAIL=`EMAIL`,e.NUMBER=`NUMBER`,e.DATE=`DATE`,e.TEXTAREA=`TEXTAREA`,e.SELECT=`SELECT`,e.CHECKBOX=`CHECKBOX`,e.RADIO=`RADIO`,e.BUTTON=`BUTTON`,e.SUBMIT=`SUBMIT`,e.UNKNOWN=`UNKNOWN`,e}({}),SELECTOR_CONFIDENCE={ID:100,HYBRID:90,NAME:80,LABEL:75,ARIA:70,PLACEHOLDER:60,CLASS:40,RELATIVE:20,XPATH:10},DOMUtils=class{static querySelectorDeep(e,t=document){let n=t.querySelector(e);if(n)return n;let r=t.querySelectorAll(`*`);for(let t of Array.from(r))if(t.shadowRoot){let n=this.querySelectorDeep(e,t.shadowRoot);if(n)return n}return null}static querySelectorAllDeep(e,t=document){let n=Array.from(t.querySelectorAll(e)),r=t.querySelectorAll(`*`);for(let t of Array.from(r))t.shadowRoot&&(n=[...n,...this.querySelectorAllDeep(e,t.shadowRoot)]);return n}static isVisible(e){let t=window.getComputedStyle(e);return t.display!==`none`&&t.visibility!==`hidden`&&t.opacity!==`0`&&e.offsetWidth>0&&e.offsetHeight>0}},SelectorBuilder=class{static build(e){let t=[];e.id&&!this.isDynamic(e.id)&&t.push({selector:`#${e.id}`,type:`ID`,confidence:SELECTOR_CONFIDENCE.ID});let n=this.generateHybridSelector(e);n&&t.push(this.disambiguate(e,n,`HYBRID`,SELECTOR_CONFIDENCE.HYBRID));let r=e.getAttribute(`name`);r&&t.push(this.disambiguate(e,`[name="${r}"]`,`NAME`,SELECTOR_CONFIDENCE.NAME));let i=e.getAttribute(`aria-label`);i&&t.push(this.disambiguate(e,`[aria-label="${i}"]`,`ARIA`,SELECTOR_CONFIDENCE.ARIA));let a=e.getAttribute(`placeholder`);if(a&&t.push(this.disambiguate(e,`[placeholder="${a}"]`,`PLACEHOLDER`,SELECTOR_CONFIDENCE.PLACEHOLDER)),e.className&&typeof e.className==`string`){let n=e.className.split(/\s+/).filter(e=>e&&!this.isDynamic(e));n.length>0&&t.push(this.disambiguate(e,`.${n.join(`.`)}`,`CLASS`,SELECTOR_CONFIDENCE.CLASS))}t.push(this.disambiguate(e,e.tagName.toLowerCase(),`RELATIVE`,SELECTOR_CONFIDENCE.RELATIVE));let o=this.getXPath(e);return o&&t.push({selector:o,type:`XPATH`,confidence:SELECTOR_CONFIDENCE.XPATH}),t.sort((e,t)=>t.confidence-e.confidence)}static getSpec(e){let t=e.getBoundingClientRect(),n=typeof e.className==`string`?e.className:e.className?.baseVal||``,r={tagName:e.tagName.toLowerCase(),innerText:e.innerText?.substring(0,100)||``,role:e.getAttribute(`role`)||``,className:n,id:e.id||``,name:e.getAttribute(`name`)||``,rect:{x:t.left+window.scrollX,y:t.top+window.scrollY,w:t.width,h:t.height}};if(e instanceof HTMLInputElement){r.type=e.type,r.placeholder=e.placeholder||``,r.min=e.getAttribute(`min`)||``,r.max=e.getAttribute(`max`)||``,r.step=e.getAttribute(`step`)||``;let t=e.getAttribute(`list`);if(t){let n=e.getRootNode(),i=typeof n.getElementById==`function`?n.getElementById(t):null;i&&(r.options=Array.from(i.querySelectorAll(`option`)).map(e=>e.value||e.text),r.type=`select`)}}else e instanceof HTMLTextAreaElement?(r.type=`textarea`,r.placeholder=e.placeholder||``):e instanceof HTMLSelectElement&&(r.type=`select`,r.options=Array.from(e.options).map(e=>e.value||e.text));return r}static generateHybridSelector(e){let t=e.tagName.toLowerCase();if(e.id&&!this.isDynamic(e.id))return`#${e.id}`;let n=typeof e.className==`string`?e.className:e.className?.baseVal||``;if(n){let e=n.split(/\s+/).filter(e=>e&&!this.isDynamic(e));e.length>0&&(t+=`.${e.join(`.`)}`)}let r=1,i=e.previousElementSibling;for(;i;)i.tagName===e.tagName&&r++,i=i.previousElementSibling;t+=`:nth-of-type(${r})`;try{if(DOMUtils.querySelectorAllDeep(t).length===1)return t}catch{}let a=e.parentElement,o=t,s=0;for(;a&&a.tagName!==`BODY`&&a.tagName!==`HTML`&&s<4;){let e=a.tagName.toLowerCase();if(a.id&&!this.isDynamic(a.id)){o=`#${a.id} > ${o}`;break}let t=typeof a.className==`string`?a.className:a.className?.baseVal||``;if(t){let n=t.split(/\s+/).filter(e=>e&&!this.isDynamic(e));n.length>0&&(e+=`.${n.join(`.`)}`)}let n=1,r=a.previousElementSibling;for(;r;)r.tagName===a.tagName&&n++,r=r.previousElementSibling;e+=`:nth-of-type(${n})`,o=`${e} > ${o}`;try{if(DOMUtils.querySelectorAllDeep(o).length===1)return o}catch{}a=a.parentElement,s++}return o}static disambiguate(e,t,n,r){try{let i=DOMUtils.querySelectorAllDeep(t);if(i.length<=1)return{selector:t,type:n,confidence:r};let a=0;for(let t=0;t<i.length;t++)if(i[t]===e){a=t;break}return{selector:t,index:a,type:n,confidence:r-5}}catch{return{selector:t,type:n,confidence:r}}}static getXPath(e){if(e.id&&!this.isDynamic(e.id))return`//*[@id="${e.id}"]`;let t=[];for(;e&&e.nodeType===Node.ELEMENT_NODE;e=e.parentNode){let n=0;for(let t=e.previousSibling;t;t=t.previousSibling)t.nodeType!==Node.DOCUMENT_TYPE_NODE&&t.nodeName===e.nodeName&&++n;let r=e.nodeName.toLowerCase(),i=n?`[${n+1}]`:``;t.splice(0,0,r+i)}return t.length?`/`+t.join(`/`):``}static isDynamic(e){return typeof e==`string`?/\d{6,}/.test(e)||/[a-f0-9]{12,}/i.test(e):!0}},SelectorHealer=class{static findElement(e,t){if(!e||e.length===0)return{element:null,selector:null};let n=null,r=(e||[]).filter(e=>e.selector&&e.selector.trim().length>0);for(let e of r)try{let r=DOMUtils.querySelectorAllDeep(e.selector)[e.index||0];if(r instanceof HTMLElement){if(t&&t.tagName&&this.calculateSimilarity(r,t)<.5)continue;if(DOMUtils.isVisible(r))return{element:r,selector:e.selector};n||={element:r,selector:e.selector}}}catch{}if(n)return console.warn(`[SelectorHealer] No visible match found, using fallback match: ${n.selector}`),n;if(t&&t.rect&&t.rect.w>0)try{let e=((e,t)=>{let n=document.elementFromPoint(e,t);for(;n&&n.shadowRoot;){let r=n.shadowRoot.elementFromPoint(e,t);if(!r||r===n)break;n=r}return n})(t.rect.x-window.scrollX+t.rect.w/2,t.rect.y-window.scrollY+t.rect.h/2);if(e){let n=this.calculateSimilarity(e,t);if(n>=.9)return console.log(`[SelectorHealer] Self-healed via coordinates! Similarity: ${(n*100).toFixed(1)}%`),{element:e,selector:`COORDINATE_HEALED`}}}catch{}return{element:null,selector:null}}static calculateSimilarity(e,t){if(!e||!t||!t.tagName)return 0;let n=0,r=0,i=(e,t,i)=>{r+=i,t&&(e===t?n+=i:(e.includes(t)||t.includes(e))&&(n+=i*.5))};if(i(e.tagName.toLowerCase(),t.tagName,10),i(e.id||``,t.id||``,10),i(e.getAttribute(`name`)||``,t.name||``,10),i(e.getAttribute(`role`)||``,t.role||``,5),r+=20,t.innerText){let r=e.innerText?.substring(0,100)||``;r===t.innerText?n+=20:(r.includes(t.innerText)||t.innerText.includes(r))&&(n+=10)}return n/r}},SmartScanner=class{static scan(e=document){let t=[];if(e instanceof HTMLElement&&this.isInteractive(e)&&this.isVisible(e)){let n=this.analyzeElement(e,document);n&&t.push(n)}return e.querySelectorAll(`input, textarea, select, button, [role="button"], [role="checkbox"], [role="textbox"], a.btn, a.button`).forEach(n=>{let r=n;if(!this.isVisible(r))return;let i=e instanceof HTMLElement?e.ownerDocument||document:e,a=this.analyzeElement(r,i);a&&t.push(a),r.shadowRoot&&t.push(...this.scan(r.shadowRoot))}),e instanceof HTMLElement&&this.isInteractive(e)||e.querySelectorAll(`*`).forEach(e=>{let n=e;n.shadowRoot&&t.push(...this.scan(n.shadowRoot))}),e.querySelectorAll(`iframe`).forEach(e=>{try{let n=e;n.contentDocument&&t.push(...this.scan(n.contentDocument))}catch{}}),t}static isInteractive(e){let t=e.tagName,n=e.getAttribute(`role`);return[`INPUT`,`TEXTAREA`,`SELECT`,`BUTTON`,`A`].includes(t)||n!==null&&[`button`,`checkbox`,`textbox`,`link`].includes(n)}static analyzeElement(e,t){let n=e.tagName,r=e.getAttribute(`role`),i=FieldType.UNKNOWN;if(n===`INPUT`)switch(e.type){case`password`:i=FieldType.PASSWORD;break;case`email`:i=FieldType.EMAIL;break;case`number`:i=FieldType.NUMBER;break;case`date`:i=FieldType.DATE;break;case`checkbox`:i=FieldType.CHECKBOX;break;case`radio`:i=FieldType.RADIO;break;case`submit`:i=FieldType.SUBMIT;break;case`button`:i=FieldType.BUTTON;break;default:i=FieldType.TEXT}else if(n===`TEXTAREA`||r===`textbox`)i=FieldType.TEXTAREA;else if(n===`SELECT`)i=FieldType.SELECT;else if(n===`BUTTON`||r===`button`||n===`A`){i=FieldType.BUTTON;let t=e.textContent?.trim().toLowerCase()||``;[`submit`,`continue`,`next`,`proceed`,`save`,`apply`,`finish`].some(e=>t.includes(e))&&(i=FieldType.SUBMIT)}else r===`checkbox`&&(i=FieldType.CHECKBOX);let a=this.findLabel(e,t),o=SelectorBuilder.build(e);return o.length===0?null:{id:crypto.randomUUID(),label:a||o[0].selector,type:i,tagName:n,placeholder:e.getAttribute(`placeholder`)||void 0,isRequired:e.hasAttribute(`required`)||e.getAttribute(`aria-required`)===`true`,isVisible:!0,selectors:o,metadata:{name:e.getAttribute(`name`)||void 0,ariaLabel:e.getAttribute(`aria-label`)||void 0,options:this.getOptions(e),isWorkflowOpportunity:i===FieldType.SUBMIT}}}static findLabel(e,t){let n=e.getAttribute(`aria-label`);if(n)return n;if(e.id){let n=t.querySelector(`label[for="${e.id}"]`);if(n)return n.textContent?.trim()||null}let r=e.closest(`label`);if(r)return r.textContent?.trim()||null;let i=e.getAttribute(`placeholder`);if(i)return i;let a=e.getAttribute(`name`);if(a)return a;if(e.tagName===`BUTTON`||e.tagName===`A`||e.getAttribute(`role`)===`button`){let t=e.textContent?.trim();if(t&&t.length<50)return t}return null}static getOptions(e){if(e.tagName!==`SELECT`)return;let t=e;return Array.from(t.options).map(e=>({label:e.text,value:e.value}))}static isVisible(e){let t=window.getComputedStyle(e);return t.display!==`none`&&t.visibility!==`hidden`&&t.opacity!==`0`&&e.offsetWidth>0&&e.offsetHeight>0}},Messenger=class{static async send(e,t){let n={id:crypto.randomUUID(),type:e,payload:t};try{return await chrome.runtime.sendMessage(n)}catch(t){let n=t.message||``;return n.includes(`Could not establish connection`)||n.includes(`Receiving end does not exist`)?console.warn(`Messenger [${e}]: Service worker is waking up...`):console.error(`Messenger error [${e}]:`,t),{success:!1,error:{code:`IPC_ERROR`,message:t.message||`Unknown IPC error`}}}}static async sendToTab(e,t,n){let r={id:crypto.randomUUID(),type:t,payload:n};try{return await chrome.tabs.sendMessage(e,r)}catch(n){return console.warn(`[FlowPilot] IPC Connection Warning [${t}] on tab ${e}: ${n.message}. This may be handled by automatic re-injection.`),{success:!1,error:{code:`IPC_TAB_ERROR`,message:n.message||`Unknown IPC tab error`}}}}static async broadcastToTab(e,t,n){let r={id:crypto.randomUUID(),type:t,payload:n};try{let t=await chrome.webNavigation.getAllFrames({tabId:e});if(!t||t.length===0)return await chrome.tabs.sendMessage(e,r);let n=t.map(async t=>{try{return await chrome.tabs.sendMessage(e,r,{frameId:t.frameId})}catch(e){return{success:!1,error:{code:`IPC_FRAME_ERROR`,message:e.message}}}}),i=await Promise.all(n);return i.find(e=>e&&e.success)||i.find(e=>e&&!e.success&&e.error?.code!==`IPC_FRAME_ERROR`)||i[0]||{success:!1,error:{code:`NOT_FOUND`,message:`No frame responded successfully`}}}catch{try{return await chrome.tabs.sendMessage(e,r)}catch(e){return{success:!1,error:{code:`IPC_TAB_ERROR`,message:e.message||`Unknown IPC tab error`}}}}}static listen(e){chrome.runtime.onMessage.addListener((t,n,r)=>(e(t).then(e=>{e&&r(e)}).catch(e=>{console.error(`Messenger handler error:`,e),r({success:!1,error:{code:`HANDLER_ERROR`,message:e.message}})}),!0))}},Recorder=class{static isRecording=!1;static activeWorkflowId=null;static init(){document.addEventListener(`click`,e=>this.handleClick(e),!0),document.addEventListener(`input`,e=>this.handleInput(e),!0),console.log(`FlowPilot Recorder Initialized`)}static start(e){this.isRecording=!0,this.activeWorkflowId=e,console.log(`Recording started for workflow: ${e}`)}static stop(){this.isRecording=!1,this.activeWorkflowId=null,console.log(`Recording stopped`)}static async handleClick(e){if(!this.isRecording)return;let t=e.target;if(!t)return;let n=SelectorBuilder.build(t),r=SelectorBuilder.getSpec(t),i={id:crypto.randomUUID(),type:`CLICK`,selector:n[0].selector,candidates:n,metadata:{spec:r},timestamp:Date.now()};this.emitEvent(i)}static async handleInput(e){if(!this.isRecording)return;let t=e.target;if(!t)return;let n=SelectorBuilder.build(t),r=SelectorBuilder.getSpec(t),i={id:crypto.randomUUID(),type:`TYPE`,selector:n[0].selector,candidates:n,value:t.value,metadata:{spec:r},timestamp:Date.now()};this.emitEvent(i)}static async emitEvent(e){this.activeWorkflowId&&(console.log(`Recording Action:`,e),await Messenger.send(MessageType.RECORDER_EVENT,{workflowId:this.activeWorkflowId,action:e}))}},ElementPicker=class{static overlay=null;static currentElement=null;static isActive=!1;static options={};static activeMenu=null;static start(e={}){this.stop(),this.isActive=!0,this.options=e,this.createOverlay(),document.addEventListener(`mousemove`,this.onMouseMove,!0),document.addEventListener(`click`,this.onClick,!0),document.addEventListener(`keydown`,this.onKeyDown,!0)}static stop(){this.isActive=!1,this.removeOverlay(),document.removeEventListener(`mousemove`,this.onMouseMove,!0),document.removeEventListener(`click`,this.onClick,!0),document.removeEventListener(`keydown`,this.onKeyDown,!0);let e=document.getElementById(`fp-picker-overlay`);e&&e.remove(),this.activeMenu&&=(this.activeMenu.remove(),null)}static createOverlay(){this.overlay=document.createElement(`div`),this.overlay.id=`fp-picker-overlay`,Object.assign(this.overlay.style,{position:`fixed`,pointerEvents:`none`,zIndex:`1000000`,border:`2px solid #3b82f6`,background:`rgba(59, 130, 246, 0.1)`,borderRadius:`4px`,transition:`all 0.1s ease-out`,display:`none`}),document.body.appendChild(this.overlay)}static removeOverlay(){this.overlay?.remove(),this.overlay=null}static getElementFromPoint(e,t){let n=document.elementFromPoint(e,t);for(;n&&n.shadowRoot;){let r=n.shadowRoot.elementFromPoint(e,t);if(!r||r===n)break;n=r}return n}static onMouseMove=e=>{if(!this.isActive||this.activeMenu&&this.activeMenu.contains(e.target))return;let t=this.getElementFromPoint(e.clientX,e.clientY);if(!t||t===this.overlay)return;this.currentElement=t;let n=t.getBoundingClientRect();this.overlay&&(this.overlay.style.display=`block`,this.overlay.style.top=`${n.top}px`,this.overlay.style.left=`${n.left}px`,this.overlay.style.width=`${n.width}px`,this.overlay.style.height=`${n.height}px`)};static findAssociatedFileInput(e){let t=e.closest(`label`);if(t){if(t.htmlFor){let e=document.getElementById(t.htmlFor);if(e instanceof HTMLInputElement&&e.type===`file`)return e}let e=t.querySelector(`input[type="file"]`);if(e instanceof HTMLInputElement)return e}let n=e.parentElement;if(n){let e=n.querySelector(`input[type="file"]`);if(e instanceof HTMLInputElement)return e}return null}static onClick=e=>{if(!this.isActive||this.activeMenu&&this.activeMenu.contains(e.target))return;e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation();let t=this.getElementFromPoint(e.clientX,e.clientY)||this.currentElement;if(t){let n=this.findAssociatedFileInput(t);n&&(t=n);let r=[];r.push({type:`exact`,element:t,label:t.tagName,desc:this.getElementDescription(t)});let i=t.parentElement,a=0;for(;i&&i.tagName!==`BODY`&&i.tagName!==`HTML`&&a<4;)r.push({type:`parent`,element:i,label:i.tagName,desc:this.getElementDescription(i)}),i=i.parentElement,a++;let o=t.querySelectorAll(`input, button, a, select, textarea`),s=0;for(let e of o)e!==t&&s<4&&(r.push({type:`child`,element:e,label:e.tagName,desc:this.getElementDescription(e)}),s++);this.showOptionMenu(e,r)}};static getElementDescription(e){let t=e.id?`#${e.id}`:``,n=e.className&&typeof e.className==`string`?`.${e.className.trim().split(/\s+/).join(`.`)}`:``,r=e.innerText?.slice(0,20).trim()||e.getAttribute(`placeholder`)||``;return`${t}${n}${r?` "${r}"`:``}`}static showOptionMenu(e,t){this.activeMenu&&this.activeMenu.remove();let n=document.createElement(`div`);n.id=`fp-picker-menu`,this.activeMenu=n,Object.assign(n.style,{position:`absolute`,top:`${e.clientY+window.scrollY+10}px`,left:`${e.clientX+window.scrollX+10}px`}),document.body.appendChild(n);let r=n.getBoundingClientRect();r.right>window.innerWidth&&(n.style.left=`${e.clientX+window.scrollX-r.width-10}px`),r.bottom>window.innerHeight&&(n.style.top=`${e.clientY+window.scrollY-r.height-10}px`);let i=t.filter(e=>e.type===`exact`);if(i.length>0){let e=document.createElement(`div`);e.className=`fp-menu-section-title`,e.innerText=`Exact Element`,n.appendChild(e),i.forEach(e=>n.appendChild(this.createMenuButton(e)))}let a=t.filter(e=>e.type===`parent`);if(a.length>0){let e=document.createElement(`div`);e.className=`fp-menu-section-title`,e.innerText=`Parent Elements`,n.appendChild(e),a.forEach(e=>n.appendChild(this.createMenuButton(e)))}let o=t.filter(e=>e.type===`child`);if(o.length>0){let e=document.createElement(`div`);e.className=`fp-menu-section-title`,e.innerText=`Child Elements`,n.appendChild(e),o.forEach(e=>n.appendChild(this.createMenuButton(e)))}}static createMenuButton(e){let t=document.createElement(`button`);t.className=`fp-menu-item`;let n=document.createElement(`span`);n.className=`fp-menu-item-tag`,n.innerText=e.label;let r=document.createElement(`span`);return r.innerText=e.desc,r.style.fontSize=`0.65rem`,r.style.color=`#64748b`,t.appendChild(n),t.appendChild(r),t.addEventListener(`mouseenter`,()=>{let t=e.element.getBoundingClientRect();this.overlay&&(this.overlay.style.display=`block`,this.overlay.style.top=`${t.top}px`,this.overlay.style.left=`${t.left}px`,this.overlay.style.width=`${t.width}px`,this.overlay.style.height=`${t.height}px`)}),t.addEventListener(`click`,t=>{t.stopPropagation(),this.chooseElement(e.element)}),t}static chooseElement(e){if(this.options.source!==`standalone`){this.scanAndSend(e),this.activeMenu&&this.activeMenu.remove(),this.activeMenu=null;return}if(!this.activeMenu)return;this.activeMenu.innerHTML=``;let t=document.createElement(`div`);t.className=`fp-menu-section-title`,t.innerText=`Choose Action/Tool`,this.activeMenu.appendChild(t),[{type:`CLICK`,label:`Click Element`,desc:`Simulate click interaction`},{type:`TYPE`,label:`Type Text / Value`,desc:`Simulate input typing / form fill`},{type:`hover`,label:`Hover Over`,desc:`Simulate mouse enter / hover state`},{type:`scroll-into-view`,label:`Scroll Into View`,desc:`Scroll viewport to element`},{type:`extract-text`,label:`Extract Text`,desc:`Read and save element inner text`},{type:`assert-visible`,label:`Assert Visible`,desc:`Wait and verify element is visible`},{type:`paste`,label:`Paste Clipboard`,desc:`Simulate clipboard text or file paste`}].forEach(t=>{let n=document.createElement(`button`);n.className=`fp-menu-item`;let r=document.createElement(`span`);r.className=`fp-menu-item-tag`,r.innerText=t.label;let i=document.createElement(`span`);i.style.fontSize=`0.65rem`,i.style.color=`#64748b`,i.innerText=t.desc,n.appendChild(r),n.appendChild(i),n.addEventListener(`click`,n=>{n.stopPropagation(),this.scanAndSend(e,t.type),this.activeMenu&&this.activeMenu.remove(),this.activeMenu=null}),this.activeMenu?.appendChild(n)})}static onKeyDown=e=>{e.key===`Escape`&&this.stop()};static async scanAndSend(e,t){let n=SelectorBuilder.getSpec(e),r=t||this.options.source!==`standalone`,i=[];if(r||(i=SmartScanner.scan(e)),i.length===0){let r=SelectorBuilder.build(e),a=(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement||e.contentEditable===`true`)&&(!(e instanceof HTMLInputElement)||![`button`,`submit`,`reset`,`checkbox`,`radio`,`file`,`image`].includes(e.type));i=[{label:e.innerText?.slice(0,30).trim()||e.getAttribute(`aria-label`)||e.getAttribute(`placeholder`)||e.id||e.tagName,type:t||(a?`TYPE`:`CLICK`),selectors:r,placeholder:e.getAttribute(`placeholder`)||``,metadata:{spec:n}}]}else i=i.map(e=>({...e,metadata:{...e.metadata,spec:n}}));chrome.runtime.sendMessage({type:MessageType.PICKER_SELECT,payload:{fields:i,isBatch:!r&&i.length>1}}),this.stop()}};if(!document.getElementById(`flowpilot-styles`)){let e=document.createElement(`style`);e.id=`flowpilot-styles`,e.textContent=`
    @keyframes fp-fade-in {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #fp-picker-menu {
      position: fixed;
      z-index: 1000001;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
      width: 280px;
      max-height: 400px;
      overflow-y: auto;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      color: #f8fafc;
      animation: fp-fade-in 0.15s ease-out;
    }
    .fp-menu-section-title {
      font-size: 0.65rem;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0.4rem;
      margin-bottom: 0.15rem;
      padding-left: 0.5rem;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 0.15rem;
    }
    .fp-menu-section-title:first-child {
      margin-top: 0.15rem;
    }
    .fp-menu-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      background: transparent;
      border: none;
      text-align: left;
      padding: 0.45rem 0.6rem;
      border-radius: 8px;
      cursor: pointer;
      width: 100%;
      color: #e2e8f0;
      transition: all 0.15s ease;
    }
    .fp-menu-item:hover {
      background: #1e293b;
      color: #3b82f6;
    }
    .fp-menu-item-tag {
      font-size: 0.75rem;
      font-weight: 700;
    }
  `,document.head.appendChild(e)}var FloatingHUD=class{static container=null;static statusElement=null;static toastStack=null;static isExpanded=!1;static currentState={message:`Ready`,status:`IDLE`,progress:0};static autoCloseTimeout=null;static init(){let e=document.getElementById(`fp-hud-container`);e&&e.remove(),this.container=document.createElement(`div`),this.container.id=`fp-hud-container`,this.container.style.cssText=`
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column-reverse;
      gap: 12px;
      z-index: 2147483647;
      pointer-events: none;
      font-family: 'Inter', system-ui, sans-serif;
    `,document.body.appendChild(this.container),this.statusElement=document.createElement(`div`),this.statusElement.id=`fp-status-row`,this.statusElement.className=`fp-hud-panel`,this.container.appendChild(this.statusElement),this.statusElement.addEventListener(`mouseenter`,()=>this.setExpanded(!0)),this.statusElement.addEventListener(`mouseleave`,()=>this.setExpanded(!1)),this.statusElement.addEventListener(`click`,e=>{e.stopPropagation(),e.preventDefault();let t=e.target.closest(`button`);if(!t)return;let n=t.id;n===`fp-pause`?Messenger.send(MessageType.WORKFLOW_PAUSE,{sessionId:this.currentState.sessionId}):n===`fp-resume`?Messenger.send(MessageType.WORKFLOW_RESUME,{sessionId:this.currentState.sessionId}):n===`fp-step`?Messenger.send(MessageType.WORKFLOW_STEP,{sessionId:this.currentState.sessionId}):n===`fp-stop`?Messenger.send(MessageType.WORKFLOW_STOP,{sessionId:this.currentState.sessionId}):n===`fp-cancel-picker`?Messenger.send(MessageType.PICKER_STOP,{}):n===`fp-close`&&this.update({status:`IDLE`,message:`Ready`,progress:0,details:``,error:``})},!0),this.toastStack=document.createElement(`div`),this.toastStack.id=`fp-toast-stack`,this.container.appendChild(this.toastStack),this.injectStyles(),this.render()}static update(e){this.currentState={...this.currentState,...e},this.autoCloseTimeout&&=(clearTimeout(this.autoCloseTimeout),null),this.currentState.status===`SUCCESS`&&(this.autoCloseTimeout=setTimeout(()=>{this.update({status:`IDLE`,message:`Ready`,progress:0,details:``,error:``})},5e3)),this.render()}static setExpanded(e){this.isExpanded=e,this.render()}static render(){this.statusElement||this.init();let{status:e,message:t,progress:n,details:r,error:i,currentStep:a,totalSteps:o,currentRow:s,totalRows:c}=this.currentState;if(e===`IDLE`){this.statusElement.style.display=`none`;return}else this.statusElement.style.display=`block`;let l={IDLE:`#64748b`,RUNNING:`#3b82f6`,PAUSED:`#f59e0b`,ERROR:`#ef4444`,SUCCESS:`#10b981`}[e];this.statusElement.style.borderColor=`${l}44`,this.statusElement.innerHTML=`
      <div class="fp-hud-main">
        <div class="fp-pulse-dot ${e===`RUNNING`||e===`PAUSED`?`pulse`:``}" style="background: ${l}; box-shadow: 0 0 12px ${l}"></div>
        <div class="fp-hud-content">
          <div class="fp-hud-header">
            <span class="fp-hud-label">${e===`ERROR`?`System Error`:`FlowPilot Engine`}</span>
            <div class="fp-hud-badges">
              ${c&&c>1?`<span class="fp-hud-badge row">Row ${s}/${c}</span>`:``}
              ${o?`<span class="fp-hud-badge step">Step ${a}/${o}</span>`:``}
            </div>
          </div>
          <div class="fp-hud-message">${t}</div>
        </div>
        <div class="fp-hud-actions">
          ${t.toLowerCase().includes(`picker`)?`<button id="fp-cancel-picker" class="fp-icon-btn danger" title="Cancel Picker">✕</button>`:``}
          ${(e===`RUNNING`||e===`PAUSED`)&&!t.toLowerCase().includes(`picker`)?`<button id="fp-stop" class="fp-icon-btn danger" title="Stop & Exit">⏹</button>`:``}
          ${e===`RUNNING`&&!t.toLowerCase().includes(`picker`)?`<button id="fp-pause" class="fp-icon-btn" title="Pause">⏸</button>`:``}
          ${e===`PAUSED`&&!t.toLowerCase().includes(`picker`)?`
            <button id="fp-step" class="fp-icon-btn" title="Next Step">⏭</button>
            <button id="fp-resume" class="fp-icon-btn success" title="Resume">▶</button>
          `:``}
          ${e===`ERROR`||e===`SUCCESS`?`<button id="fp-close" class="fp-icon-btn" title="Close">✕</button>`:``}
        </div>
      </div>

      <div class="fp-hud-details ${this.isExpanded?`show`:``}">
        <div class="fp-progress-container">
          <div class="fp-progress-bar" style="width: ${n}%; background: ${l}"></div>
        </div>
        ${r?`<div class="fp-detail-text">${r}</div>`:``}
        ${i?`<div class="fp-error-text">${i}</div>`:``}
        
        <div class="fp-hud-footer">
          <div class="fp-badge">${e}</div>
          <div class="fp-progress-percent">${Math.round(n)}%</div>
        </div>
      </div>
    `}static showPulse(e){if(!e)return;let t=e.getBoundingClientRect(),n=document.createElement(`div`);n.style.cssText=`
      position: absolute;
      top: ${t.top+window.scrollY}px;
      left: ${t.left+window.scrollX}px;
      width: ${t.width}px;
      height: ${t.height}px;
      border: 3px solid #3b82f6;
      border-radius: 6px;
      pointer-events: none;
      z-index: 999998;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
      animation: fp-pulse-highlight 1.5s ease-out forwards;
    `,document.body.appendChild(n),setTimeout(()=>n.remove(),1500)}static injectStyles(){if(document.getElementById(`fp-hud-styles`))return;let e=document.createElement(`style`);e.id=`fp-hud-styles`,e.textContent=`
      .fp-hud-panel {
        background: #0f172a;
        backdrop-filter: none;
        color: white;
        padding: 14px 20px;
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
        pointer-events: auto;
        min-width: 280px;
        max-width: 340px;
        transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        border: 1px solid transparent;
        overflow: hidden;
        transform-origin: bottom right;
      }
      .fp-hud-panel:hover {
        transform: scale(1.02);
        max-width: 380px;
        background: #0f172a;
        box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15);
      }
      .fp-hud-main {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .fp-hud-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .fp-hud-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .fp-hud-label {
        opacity: 0.6;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 800;
        white-space: nowrap;
      }
      .fp-hud-badges {
        display: flex;
        gap: 4px;
      }
      .fp-hud-badge {
        font-size: 10px;
        font-weight: 800;
        background: rgba(255,255,255,0.12);
        padding: 2px 6px;
        border-radius: 4px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .fp-hud-badge.row { border-left: 2px solid var(--accent); color: #3b82f6; }
      .fp-hud-badge.step { opacity: 0.8; }
      .fp-hud-message {
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fp-hud-actions {
        display: flex;
        gap: 6px;
      }
      .fp-icon-btn {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.05);
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .fp-icon-btn:hover { 
        background: rgba(255,255,255,0.2); 
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .fp-icon-btn.success { color: #10b981; }
      .fp-icon-btn.success:hover { background: rgba(16, 185, 129, 0.2); }
      .fp-icon-btn.danger { color: #ef4444; }
      .fp-icon-btn.danger:hover { background: rgba(239, 68, 68, 0.2); }
      
      .fp-hud-details {
        max-height: 0;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        padding-top: 0;
        pointer-events: none;
      }
      .fp-hud-details.show {
        max-height: 250px;
        opacity: 1;
        padding-top: 16px;
        margin-top: 14px;
        border-top: 1px solid rgba(255,255,255,0.1);
        pointer-events: auto;
      }
      
      .fp-progress-container {
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 12px;
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
      }
      .fp-progress-bar {
        height: 100%;
        transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 0 10px rgba(255,255,255,0.2);
      }
      
      .fp-detail-text { font-size: 12px; opacity: 0.8; line-height: 1.5; margin-bottom: 10px; font-weight: 500; }
      .fp-error-text { 
        font-size: 12px; 
        color: #fca5a5; 
        background: rgba(239, 68, 68, 0.15);
        padding: 10px 14px;
        border-radius: 10px;
        margin-bottom: 10px;
        border-left: 3px solid #ef4444;
        font-weight: 600;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
      }
      
      .fp-hud-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 4px;
      }
      .fp-badge {
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        background: rgba(255,255,255,0.12);
        padding: 3px 8px;
        border-radius: 6px;
        letter-spacing: 0.05em;
      }
      .fp-progress-percent { font-size: 11px; font-weight: 800; opacity: 0.6; font-variant-numeric: tabular-nums; }

      @keyframes fp-hud-pop {
        from { transform: translateY(30px) scale(0.9); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
      .fp-pulse-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      .fp-pulse-dot.pulse {
        animation: fp-dot-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
      }
      @keyframes fp-dot-pulse {
        0%, 100% { opacity: 1; transform: scale(1); filter: brightness(1.2); }
        50% { opacity: 0.5; transform: scale(0.85); filter: brightness(1); }
      }
    `,document.head.appendChild(e)}static notify(e,t=`INFO`,n=4e3){this.toastStack||this.init();let r={INFO:`#3b82f6`,SUCCESS:`#10b981`,WARNING:`#f59e0b`,ERROR:`#ef4444`},i=document.createElement(`div`);i.className=`fp-toast fade-in`,i.style.cssText=`
      background: #1e293b;
      backdrop-filter: none;
      color: white;
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-left: 3px solid ${r[t]};
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
      max-width: 320px;
      pointer-events: auto;
      animation: fp-hud-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    `,i.textContent=e,this.toastStack.appendChild(i),setTimeout(()=>{i.style.opacity=`0`,i.style.transform=`translateX(20px)`,setTimeout(()=>i.remove(),300)},n)}},SPAWatcher=class{static lastUrl=``;static init(){let e=document.createElement(`script`);e.src=chrome.runtime.getURL(`spa-bridge.js`),(document.head||document.documentElement).appendChild(e),e.onload=()=>e.remove(),window.addEventListener(`flowpilot-navigation`,()=>{this.handleNavigation()}),this.lastUrl=window.location.href}static async handleNavigation(){window.location.href!==this.lastUrl&&(this.lastUrl=window.location.href,console.log(`SPA Navigation detected:`,this.lastUrl),await Messenger.send(`SPA_NAVIGATED`,{url:this.lastUrl,timestamp:Date.now()}))}static async waitForStability(e=1500){return new Promise(t=>{let n,r=new MutationObserver(()=>{clearTimeout(n),n=setTimeout(()=>{r.disconnect(),t()},150)});r.observe(document.body,{childList:!0,subtree:!0,attributes:!0}),setTimeout(()=>{r.disconnect(),t()},e)})}},MouseHelper=class{static async click(e){try{let t=e.getAttribute(`href`);return t&&t.toLowerCase().startsWith(`javascript:`)?e.dispatchEvent(new MouseEvent(`click`,{bubbles:!0,cancelable:!0,view:window})):e.click(),{success:!0}}catch(e){return{success:!1,error:{code:`CLICK_FAILED`,message:e.message}}}}static async dblclick(e){try{return e.dispatchEvent(new MouseEvent(`dblclick`,{bubbles:!0,cancelable:!0,view:window})),{success:!0}}catch(e){return{success:!1,error:{code:`DBLCLICK_FAILED`,message:e.message}}}}static async rightClick(e){try{return e.dispatchEvent(new MouseEvent(`contextmenu`,{bubbles:!0,cancelable:!0,view:window})),{success:!0}}catch(e){return{success:!1,error:{code:`RIGHTCLICK_FAILED`,message:e.message}}}}static async hover(e){try{e.dispatchEvent(new MouseEvent(`mouseenter`,{bubbles:!0})),e.dispatchEvent(new MouseEvent(`mouseover`,{bubbles:!0}));let t=e.style.outline;return e.style.outline=`2px dashed var(--accent, #3b82f6)`,setTimeout(()=>e.style.outline=t,1e3),{success:!0}}catch(e){return{success:!1,error:{code:`HOVER_FAILED`,message:e.message}}}}static async mousedown(e){try{return e.dispatchEvent(new MouseEvent(`mousedown`,{bubbles:!0,cancelable:!0})),{success:!0}}catch(e){return{success:!1,error:{code:`MOUSEDOWN_FAILED`,message:e.message}}}}static async mouseup(e){try{return e.dispatchEvent(new MouseEvent(`mouseup`,{bubbles:!0,cancelable:!0})),{success:!0}}catch(e){return{success:!1,error:{code:`MOUSEUP_FAILED`,message:e.message}}}}static async mousemove(e){try{return e.dispatchEvent(new MouseEvent(`mousemove`,{bubbles:!0,cancelable:!0})),{success:!0}}catch(e){return{success:!1,error:{code:`MOUSEMOVE_FAILED`,message:e.message}}}}static async contextmenu(e){return this.rightClick(e)}},KeyboardHelper=class{static async type(e,t){try{if(e instanceof HTMLSelectElement){e.focus();let n=!1;for(let r=0;r<e.options.length;r++)if(e.options[r].value===t){e.selectedIndex=r,n=!0;break}if(!n){for(let r=0;r<e.options.length;r++)if(e.options[r].text.trim().toLowerCase()===String(t).trim().toLowerCase()){e.selectedIndex=r,n=!0;break}}return e.dispatchEvent(new Event(`input`,{bubbles:!0})),e.dispatchEvent(new Event(`change`,{bubbles:!0})),e.blur(),{success:!0}}if(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e.contentEditable===`true`){if(e.focus(),e instanceof HTMLInputElement&&(e.type===`checkbox`||e.type===`radio`)){let n=t===`true`||t===`on`||t===`checked`||t===`1`;return e.checked!==n&&e.click(),{success:!0}}if(e instanceof HTMLInputElement&&e.type===`file`)try{let n=new DataTransfer,r;if(t instanceof File)r=t;else if(typeof t==`string`&&t.startsWith(`file:`)){let e=t.split(`:`),n=e[1]||`file.png`,i=e[2]||`image/png`,a=e.slice(3).join(`:`)||``,o;if(a){let e=atob(a),t=Array(e.length);for(let n=0;n<e.length;n++)t[n]=e.charCodeAt(n);o=new Blob([new Uint8Array(t)],{type:i})}else o=new Blob([``],{type:i});r=new File([o],n,{type:i})}else r=new File([`dummy content`],(typeof t==`string`?t:``)||`file.txt`,{type:`text/plain`});return n.items.add(r),e.files=n.files,e.dispatchEvent(new Event(`input`,{bubbles:!0})),e.dispatchEvent(new Event(`change`,{bubbles:!0})),{success:!0}}catch(e){return{success:!1,error:{code:`FILE_INJECTION_FAILED`,message:e.message}}}return`value`in e?e.value=t:e.innerText=t,e.dispatchEvent(new Event(`input`,{bubbles:!0})),e.dispatchEvent(new Event(`change`,{bubbles:!0})),e.blur(),{success:!0}}return{success:!1,error:{code:`NOT_TYPEABLE`,message:`Element is not an input or contenteditable`}}}catch(e){return{success:!1,error:{code:`TYPE_FAILED`,message:e.message}}}}static async pressKey(e,t){try{e.focus();let n={key:t,bubbles:!0,cancelable:!0};return e.dispatchEvent(new KeyboardEvent(`keydown`,n)),e.dispatchEvent(new KeyboardEvent(`keypress`,n)),e.dispatchEvent(new KeyboardEvent(`keyup`,n)),{success:!0}}catch(e){return{success:!1,error:{code:`KEYPRESS_FAILED`,message:e.message}}}}static async keydown(e,t){try{return e.focus(),e.dispatchEvent(new KeyboardEvent(`keydown`,{key:t,bubbles:!0,cancelable:!0})),{success:!0}}catch(e){return{success:!1,error:{code:`KEYDOWN_FAILED`,message:e.message}}}}static async keyup(e,t){try{return e.focus(),e.dispatchEvent(new KeyboardEvent(`keyup`,{key:t,bubbles:!0,cancelable:!0})),{success:!0}}catch(e){return{success:!1,error:{code:`KEYUP_FAILED`,message:e.message}}}}},ScrollHelper=class{static async scrollIntoView(e){try{return e.scrollIntoView({behavior:`smooth`,block:`center`}),{success:!0}}catch(e){return{success:!1,error:{code:`SCROLL_FAILED`,message:e.message}}}}static async scrollTo(e,t){try{return e.scrollTo({top:t.y??0,left:t.x??0,behavior:`smooth`}),{success:!0}}catch(e){return{success:!1,error:{code:`SCROLL_TO_FAILED`,message:e.message}}}}static async scrollBy(e,t){try{return e.scrollBy({top:t.top??0,left:t.left??0,behavior:`smooth`}),{success:!0}}catch(e){return{success:!1,error:{code:`SCROLL_BY_FAILED`,message:e.message}}}}},FormHelper=class{static async check(e,t=!0){try{return e instanceof HTMLInputElement&&(e.type===`checkbox`||e.type===`radio`)?(e.checked!==t&&e.click(),{success:!0}):{success:!1,error:{code:`NOT_CHECKABLE`,message:`Element is not a checkbox or radio button`}}}catch(e){return{success:!1,error:{code:`CHECK_FAILED`,message:e.message}}}}static async select(e,t){try{return e instanceof HTMLSelectElement?(e.value=t,e.dispatchEvent(new Event(`change`,{bubbles:!0})),{success:!0}):{success:!1,error:{code:`NOT_SELECTABLE`,message:`Element is not a select element`}}}catch(e){return{success:!1,error:{code:`SELECT_FAILED`,message:e.message}}}}static async submit(e){try{if(e instanceof HTMLFormElement)return e.submit(),{success:!0};let t=e.closest(`form`);return t?(t.submit(),{success:!0}):{success:!1,error:{code:`NO_FORM_FOUND`,message:`Element is not part of a form`}}}catch(e){return{success:!1,error:{code:`SUBMIT_FAILED`,message:e.message}}}}static async reset(e){try{let t=e instanceof HTMLFormElement?e:e.closest(`form`);return t?(t.reset(),{success:!0}):{success:!1,error:{code:`NO_FORM_FOUND`,message:`Element is not part of a form`}}}catch(e){return{success:!1,error:{code:`RESET_FAILED`,message:e.message}}}}},StateHelper=class{static async extract(e,t,n){try{let r;return t===`TEXT`?r=e.innerText:t===`HTML`?r=e.innerHTML:t===`ATTR`&&n&&(r=e.getAttribute(n)),{success:!0,data:r}}catch(e){return{success:!1,error:{code:`EXTRACT_FAILED`,message:e.message}}}}static async assert(e,t,n){try{let r=!1,i=e.offsetWidth>0&&e.offsetHeight>0;return t===`VISIBLE`?r=i:t===`HIDDEN`?r=!i:t===`CONTAINS_TEXT`&&n&&(r=e.innerText.includes(n)),{success:r}}catch(e){return{success:!1,error:{code:`ASSERT_FAILED`,message:e.message}}}}static async focus(e){try{return e.focus(),{success:!0}}catch(e){return{success:!1,error:{code:`FOCUS_FAILED`,message:e.message}}}}static async blur(e){try{return e.blur(),{success:!0}}catch(e){return{success:!1,error:{code:`BLUR_FAILED`,message:e.message}}}}static async copy(e){try{return e.focus(),document.execCommand(`copy`),{success:!0}}catch(e){return{success:!1,error:{code:`COPY_FAILED`,message:e.message}}}}static async cut(e){try{return e.focus(),document.execCommand(`cut`),{success:!0}}catch(e){return{success:!1,error:{code:`CUT_FAILED`,message:e.message}}}}static async paste(e,t){try{e.focus();let n=new DataTransfer;if(t)if(t.startsWith(`file:`)){let e=t.split(`:`),r=e[1]||`file.png`,i=e[2]||`image/png`,a=e.slice(3).join(`:`)||``,o;if(a){let e=atob(a),t=Array(e.length);for(let n=0;n<e.length;n++)t[n]=e.charCodeAt(n);o=new Blob([new Uint8Array(t)],{type:i})}else o=new Blob([`dummy content`],{type:i});n.items.add(new File([o],r,{type:i}))}else n.setData(`text/plain`,t);else n.setData(`text/plain`,``);let r=new ClipboardEvent(`paste`,{bubbles:!0,cancelable:!0,clipboardData:n});if(e.dispatchEvent(r),t&&!t.startsWith(`file:`)){if(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement){let n=e.selectionStart||0,r=e.selectionEnd||0,i=e.value;e.value=i.substring(0,n)+t+i.substring(r),e.selectionStart=e.selectionEnd=n+t.length,e.dispatchEvent(new Event(`input`,{bubbles:!0})),e.dispatchEvent(new Event(`change`,{bubbles:!0}))}else if(e.contentEditable===`true`)try{document.execCommand(`insertText`,!1,t)}catch{}}return{success:!0}}catch(e){return{success:!1,error:{code:`PASTE_FAILED`,message:e.message}}}}},ConditionInterpreter=class{static evaluate(e){return e?.rootGroup?this.evaluateGroup(e.rootGroup):!0}static evaluateGroup(e){if(!e.conditions||e.conditions.length===0)return!0;let t=e.conditions.map(e=>e.type===`group`?this.evaluateGroup(e):this.evaluateRule(e));return e.operator===`ALL`?t.every(e=>e===!0):e.operator===`ANY`?t.some(e=>e===!0):e.operator===`NONE`?!t.some(e=>e===!0):!1}static evaluateRule(e){let t=SelectorHealer.findElement(e.candidates||(e.selector?[{selector:e.selector,type:`ID`,confidence:100}]:[]),e.spec).element,n=t&&t.offsetWidth>0&&t.offsetHeight>0,r=e.value1||``,i=e.value2||``;switch(e.ruleType){case`element_visible`:return n;case`element_not_visible`:return!n;case`element_exists`:return t!==null;case`element_not_exists`:return t===null;case`element_contains_text`:return!!(t&&(t.innerText||``).includes(r));case`element_equals_text`:return!!(t&&(t.innerText||``).trim()===r.trim());case`checkbox_checked`:return!!(t&&t.checked===!0);case`checkbox_not_checked`:return!!(t&&t.checked===!1);case`input_empty`:return!!(t&&(t.value||``).trim()===``);case`input_has_value`:return!!(t&&(t.value||``).trim()!==``);case`input_equals`:return!!(t&&(t.value||``)===r);case`dropdown_selected`:return!!(t&&t.options?.[t.selectedIndex]?.value===r);case`url_contains`:return window.location.href.includes(r);case`url_equals`:return window.location.href===r;case`title_contains`:return document.title.includes(r);case`var_empty`:return r==null||String(r).trim()===``;case`var_has_value`:return r!=null&&String(r).trim()!==``;case`var_equals`:return String(r)===i;case`var_contains`:return String(r).includes(i);case`num_gt`:return!isNaN(Number(r))&&Number(r)>Number(i);case`num_lt`:return!isNaN(Number(r))&&Number(r)<Number(i);case`num_eq`:return!isNaN(Number(r))&&Number(r)===Number(i);case`num_neq`:return!isNaN(Number(r))&&Number(r)!==Number(i);case`num_gte`:return!isNaN(Number(r))&&Number(r)>=Number(i);case`num_lte`:return!isNaN(Number(r))&&Number(r)<=Number(i);default:return!1}}};console.log(`FlowPilot Content Script Injected`);function init(){try{Recorder.init(),document.body?FloatingHUD.init():window.addEventListener(`DOMContentLoaded`,()=>FloatingHUD.init()),SPAWatcher.init()}catch(e){console.error(`FlowPilot Init Error:`,e)}}init(),window.addEventListener(`message`,async e=>{if(e.data?.type===`FP_DB_REQ`){let{id:t,action:n,table:r,criteria:i,idOrCriteria:a,rowId:o,changes:s,data:c}=e.data,l;switch(n){case`query`:l=await Messenger.send(`DB_QUERY`,{table:r,criteria:i});break;case`find`:l=await Messenger.send(`DB_FIND`,{table:r,idOrCriteria:a});break;case`add`:l=await Messenger.send(`DB_ADD`,{table:r,data:c});break;case`update`:l=await Messenger.send(`DB_UPDATE`,{table:r,rowId:o,changes:s});break;case`delete`:l=await Messenger.send(`DB_DELETE`,{table:r,rowId:o});break;case`put`:l=await Messenger.send(`DB_PUT`,{table:r,data:c});break}window.postMessage({type:`FP_DB_RES`,id:t,success:l?.success,data:l?.data},`*`)}if(e.data?.type===`FP_TABLE_REQ`){let{id:t,action:n,tableId:r,index:i,data:a,rowData:o}=e.data,s=await Messenger.send(`TABLE_ACTION`,{action:n,tableId:r,index:i,data:a,rowData:o});window.postMessage({type:`FP_TABLE_RES`,id:t,success:s.success,data:s.data},`*`)}if(e.data?.type===`FP_GLOBAL_REQ`){let{id:t,action:n,slug:r,index:i,rowData:a}=e.data,o=await Messenger.send(`GLOBAL_ACTION`,{action:n,slug:r,index:i,rowData:a});window.postMessage({type:`FP_GLOBAL_RES`,id:t,success:o.success,data:o.data},`*`)}if(e.data?.type===`FP_SCAN_REQ`){let{id:t}=e.data,n=await Messenger.send(MessageType.DOM_SCAN,{});window.postMessage({type:`FP_SCAN_RES`,id:t,success:n.success,data:n.data},`*`)}});async function handleContentMessage(request){switch(console.log(`Content Script received: ${request.type}`,request.payload),request.type){case MessageType.IPC_PING:return{success:!0,data:`PONG`};case MessageType.HUD_UPDATE:return FloatingHUD.update(request.payload),{success:!0};case MessageType.DOM_FILL:return request.payload?.skipStability||await SPAWatcher.waitForStability(),performAction(`FILL`,request.payload);case MessageType.DOM_CLICK:return request.payload?.skipStability||await SPAWatcher.waitForStability(),performAction(`CLICK`,request.payload);case MessageType.DOM_INTERACT:return request.payload?.skipStability||await SPAWatcher.waitForStability(),handleInteract(request.payload);case MessageType.DOM_EVAL:try{const{code,model}=request.payload;if(model)return{success:!0,data:ConditionInterpreter.evaluate(model)};if(code){const findElement=(e,t,n)=>SelectorHealer.findElement(t||(e?[{selector:e,type:`ID`,confidence:100}]:[]),n).element;return{success:!0,data:eval(code)}}return{success:!1,error:{code:`EMPTY_EVAL`,message:`No logic provided`}}}catch(e){return console.error(`[FlowPilot] DOM_EVAL error:`,e),{success:!1,error:{code:`EVAL_ERROR`,message:e.message}}}case MessageType.DOM_SCAN:FloatingHUD.update({message:`Scanning page...`,status:`RUNNING`});const fields=SmartScanner.scan();return FloatingHUD.update({message:`Scan complete`,status:`IDLE`}),{success:!0,data:fields};case MessageType.PICKER_START:return FloatingHUD.update({message:`Picker active`,status:`PAUSED`}),ElementPicker.start(request.payload),{success:!0};case MessageType.PICKER_STOP:return FloatingHUD.update({message:`Picker stopped`,status:`IDLE`}),ElementPicker.stop(),{success:!0};case MessageType.DOM_HIGHLIGHT:const highlightTarget=SelectorHealer.findElement(request.payload.candidates||[{selector:request.payload.selector,type:`ID`,confidence:100}]);return FloatingHUD.showPulse(highlightTarget.element),highlightElement(highlightTarget.element);case MessageType.DOM_GET_SPEC:try{let e=SelectorHealer.findElement(request.payload.candidates||[{selector:request.payload.selector,type:`ID`,confidence:100}]);return e.element?{success:!0,data:SelectorBuilder.getSpec(e.element)}:{success:!1,error:{code:`NOT_FOUND`,message:`Element not found`}}}catch(e){return{success:!1,error:{code:`GET_SPEC_FAILED`,message:e.message}}}case MessageType.RECORDER_START:return FloatingHUD.update({message:`Recording active`,status:`PAUSED`}),Recorder.start(request.payload.workflowId),{success:!0};case MessageType.RECORDER_STOP:return FloatingHUD.update({message:`Recording stopped`,status:`IDLE`}),Recorder.stop(),{success:!0};case MessageType.HUD_WAIT:return FloatingHUD.update({message:request.payload.message,status:`PAUSED`}),{success:!0};case MessageType.HUD_RESUME:return FloatingHUD.update({message:`Resuming...`,status:`RUNNING`}),{success:!0};case MessageType.DOM_WAIT_STABILITY:return FloatingHUD.update({message:`Waiting for page stability...`,status:`RUNNING`}),await SPAWatcher.waitForStability(request.payload?.timeout),FloatingHUD.update({message:`Page stable`,status:`RUNNING`}),{success:!0};default:return{success:!1,error:{code:`UNHANDLED_CONTENT_MESSAGE`,message:`Type ${request.type} not handled in content`}}}}Messenger.listen(handleContentMessage);async function performAction(e,t){let{selector:n,value:r,candidates:i,metadata:a}=t,o=n||`Unknown Selector`,s=await findTargetElement(n,i,a?.spec);return s?(FloatingHUD.update({message:`${e===`FILL`?`Filling`:`Clicking`} element...`,status:`RUNNING`}),FloatingHUD.showPulse(s),e===`FILL`?KeyboardHelper.type(s,r):MouseHelper.click(s)):{success:!1,error:{code:`ELEMENT_NOT_FOUND`,message:`Could not find element: ${o}`}}}async function handleInteract(e){let{action:t,selector:n,value:r,candidates:i,metadata:a}=e,o=n||`Unknown Selector`,s=await findTargetElement(n,i,a?.spec);if(!s)return{success:!1,error:{code:`ELEMENT_NOT_FOUND`,message:`Could not find element: ${o}`}};switch(a?.skipHUD||(FloatingHUD.update({message:`Action: ${t}...`,status:`RUNNING`}),FloatingHUD.showPulse(s)),t){case`click`:return MouseHelper.click(s);case`dblclick`:return MouseHelper.dblclick(s);case`right-click`:case`contextmenu`:return MouseHelper.rightClick(s);case`hover`:return MouseHelper.hover(s);case`mousedown`:return MouseHelper.mousedown(s);case`mouseup`:return MouseHelper.mouseup(s);case`mousemove`:return MouseHelper.mousemove(s);case`type`:return KeyboardHelper.type(s,r);case`press-enter`:return KeyboardHelper.pressKey(s,`Enter`);case`press-escape`:return KeyboardHelper.pressKey(s,`Escape`);case`keydown`:return KeyboardHelper.keydown(s,r);case`keyup`:return KeyboardHelper.keyup(s,r);case`scroll-into-view`:return ScrollHelper.scrollIntoView(s);case`scroll-top`:return ScrollHelper.scrollTo(s,{y:0});case`scroll-by`:return ScrollHelper.scrollBy(s,{top:parseInt(r)||0});case`check`:return FormHelper.check(s,!0);case`uncheck`:return FormHelper.check(s,!1);case`select`:return FormHelper.select(s,r);case`submit`:return FormHelper.submit(s);case`reset`:return FormHelper.reset(s);case`focus`:return StateHelper.focus(s);case`blur`:return StateHelper.blur(s);case`copy`:return StateHelper.copy(s);case`cut`:return StateHelper.cut(s);case`paste`:return StateHelper.paste(s,r);case`extract-text`:return StateHelper.extract(s,`TEXT`);case`extract-html`:return StateHelper.extract(s,`HTML`);case`extract-attr`:return StateHelper.extract(s,`ATTR`,a?.attribute);case`assert-visible`:return StateHelper.assert(s,`VISIBLE`);case`assert-hidden`:return StateHelper.assert(s,`HIDDEN`);default:return{success:!1,error:{code:`UNKNOWN_INTERACT_ACTION`,message:`Action ${t} not implemented`}}}}async function findTargetElement(e,t,n){let r=null;return t&&t.length>0&&(r=SelectorHealer.findElement(t,n).element),!r&&e&&(r=DOMUtils.querySelectorDeep(e)),r}async function highlightElement(e){return e?(e.scrollIntoView({behavior:`smooth`,block:`center`}),{success:!0}):{success:!1,error:{code:`NOT_FOUND`,message:`Element not found for highlighting`}}}})();