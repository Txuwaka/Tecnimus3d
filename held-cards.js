import * as THREE from './vendor/three.module.js';

// Each card has an outward back and a separate face towards its owner.
// The same sixteen cards move from the hands to the felt at the count.
export function createCardHands({scene,world,seats,hands,face,cardBack}){
  const cards=[],roots={},size={width:.29,height:.435};
  const cardGeometry=new THREE.PlaneGeometry(size.width,size.height);
  const firstPerson=new THREE.Group();firstPerson.name='Tus manos en primera persona';firstPerson.visible=false;scene.add(firstPerson);
  let playerView=false,revealed=false,viewCamera=null;
  const skin=new THREE.MeshStandardMaterial({color:0xe8b18b,roughness:1}),sleeve=new THREE.MeshStandardMaterial({color:0x8d6757,roughness:1});
  function oval(parent,scale,position,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),material);m.scale.fromArray(scale);m.position.fromArray(position);m.castShadow=false;m.receiveShadow=false;parent.add(m);return m}
  const grip=new THREE.Group();grip.name='Mano izquierda';firstPerson.add(grip);
  oval(grip,[.115,.16,.065],[.22,-.225,-.018],skin);
  oval(grip,[.105,.23,.085],[.25,-.42,.005],sleeve);
  // Fingers curl around the lower edge; the thumb rests in front of the cards.
  for(let i=0;i<3;i++)oval(grip,[.032,.070,.034],[.13+i*.045,-.18-i*.015,.025],skin);
  oval(grip,[.085,.033,.038],[.17,-.105,-.048],skin).rotation.z=-.42;
  const otherGrip=grip.clone(true);otherGrip.name='Mano derecha';otherGrip.scale.x=-1;firstPerson.add(otherGrip);
  for(const id of ['txuwa','lola','bruno','nico']){
    const root=new THREE.Group();root.name='Abanico de '+id;root.userData.entity=id;world.add(root);roots[id]=root;
    for(let i=0;i<4;i++){
      const card=hands[id][i],back=new THREE.Mesh(cardGeometry,new THREE.MeshStandardMaterial({map:cardBack,side:THREE.FrontSide,roughness:1}));
      const inside=new THREE.Mesh(cardGeometry,new THREE.MeshStandardMaterial({map:face(card),side:THREE.FrontSide,roughness:1}));
      inside.rotation.y=Math.PI;inside.position.z=-.003;inside.name='Cara privada';back.add(inside);
      Object.assign(back.userData,{home:new THREE.Vector3(),restRotation:new THREE.Euler(),card,player:id,index:i,face:inside,entity:id});
      root.add(back);cards.push(back);
    }
  }
  function layout(){
    firstPerson.visible=playerView&&!revealed&&!!viewCamera;
    for(const [id,root] of Object.entries(roots)){
      const d=seats[id],inView=id==='txuwa'&&firstPerson.visible;
      (inView?firstPerson:world).add(root);
      if(inView){root.position.set(0,0,0);root.rotation.set(0,0,0)}
      else if(revealed){root.position.set(d.x,1.78,d.z);root.rotation.set(0,d.rot,0)}
      else{
        const offset=new THREE.Vector3(0,1.85,.61).applyAxisAngle(new THREE.Vector3(0,1,0),d.rot);
        root.position.set(d.x+offset.x,offset.y,d.z+offset.z);root.rotation.set(0,d.rot,0);
      }
      for(const c of root.children){
        const n=c.userData.index-1.5;
        if(revealed){c.userData.home.set(n*.205,.008+c.userData.index*.003,.91+Math.abs(n)*.025);c.userData.restRotation.set(-Math.PI/2,0,-n*.1)}
        else{c.userData.home.set(n*.115,.022-Math.abs(n)*.035,c.userData.index*.006);c.userData.restRotation.set(0,0,-n*.18)}
        c.position.copy(c.userData.home);c.rotation.copy(c.userData.restRotation);
        c.material.map=revealed?face(c.userData.card):cardBack;c.material.side=revealed?THREE.DoubleSide:THREE.FrontSide;c.material.needsUpdate=true;
        c.userData.face.visible=!revealed;
      }
    }
    fitFirstPerson();
  }
  function fitFirstPerson(){
    if(!viewCamera)return;
    const depth=1.2,halfH=Math.tan(THREE.MathUtils.degToRad(viewCamera.fov/2))*depth,halfW=halfH*viewCamera.aspect;
    // Bound the entire hand in both portrait and landscape, above the HUD.
    const scale=Math.min(halfW*2*.58/.69,halfH*2*.36/.78);
    firstPerson.scale.setScalar(scale);firstPerson.rotation.set(0,Math.PI,0);
    firstPerson.position.set(0,-halfH*.95+.66*scale,-depth);
    firstPerson.userData.cameraDepth=depth;
  }
  layout();
  return {
    cards,roots,firstPerson,playerHands:[grip,otherGrip],
    attachCamera(camera){viewCamera=camera;scene.add(camera);camera.add(firstPerson);layout()},
    setPlayerView(value){if(playerView!==value){playerView=value;layout()}},
    fitFirstPerson,
    setHands(next,options={}){
      const nextRevealed=!!options.revealed,changed=nextRevealed!==revealed;revealed=nextRevealed;
      for(const c of cards){const card=next[c.userData.player][c.userData.index];if(!card)continue;c.userData.card=card;c.userData.selected=c.userData.player==='txuwa'&&(options.selected||[]).includes(c.userData.index);c.userData.face.material.map=face(card);c.userData.face.material.needsUpdate=true;c.material.map=revealed?face(card):cardBack;c.material.needsUpdate=true}
      if(changed)layout();
    }
  };
}
