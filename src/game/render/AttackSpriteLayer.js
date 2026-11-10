// Presentation objects are keyed by simulation identity, never by array index.
export class AttackSpriteLayer {
  constructor(scene){this.scene=scene;this.items=new Map();}
  sync(items){
    const active=new Set();
    for(const item of items){
      if(active.has(item.id))throw new TypeError(`Duplicate effect id: ${item.id}`);
      if(!this.scene.textures.exists(item.texture))throw new Error(`Missing boss FX texture: ${item.texture}`);
      active.add(item.id);let sprite=this.items.get(item.id);
      if(!sprite){sprite=this.scene.add.sprite(item.x,item.y,item.texture,item.frame).setOrigin(.5,.5);this.items.set(item.id,sprite);}
      sprite.setTexture(item.texture,item.frame).setPosition(item.x,item.y).setDisplaySize(item.width,item.height).setFlipX(item.flipX).setRotation(item.rotation).setAlpha(item.alpha).setDepth(item.depth);
    }
    for(const [id,sprite] of this.items)if(!active.has(id)){sprite.destroy();this.items.delete(id);}
  }
  destroy(){for(const sprite of this.items.values())sprite.destroy();this.items.clear();}
}
