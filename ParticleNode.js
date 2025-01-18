import Proton from "./lib/three.proton.js"
import * as THREE from 'three';
export default class ParticleNode extends THREE.Object3D  {
    constructor(json) {
        super();
        this.jsonLoader = new THREE.FileLoader(); // json文本加载器
        this.jsonLoader.setResponseType("text");
        this.textureLoader = new THREE.TextureLoader(); // 普通的贴图加载器
        var map = this.textureLoader.load("data/dot.png");
        
        this.defaultMaterial = new THREE.SpriteMaterial({
            map: map,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: true,
            blending: THREE.NormalBlending
        });
        this.defaultSprite = new THREE.Sprite(this.defaultMaterial);

        let newProton = new Proton();
        let emitter = new Proton.Emitter();
        
        // 每0.01秒 10毫秒发射 5
        emitter.rate = new Proton.Rate(new Proton.Span(2, 4), new Proton.Span(0.02, 0.02)); 
        // 粒子大小
        emitter.addInitialize(new Proton.Radius(0.1, 0.08));
        // 每个粒子是一个Sprite
        emitter.addInitialize(new Proton.Body(this.defaultSprite));
        // 粒子质量
        emitter.addInitialize(new Proton.Mass(1, 1));
        // 粒子生命
        emitter.addInitialize(new Proton.Life(0.4, 0.8));
        // 粒子的速度 大小 方向 角度
        emitter.addInitialize(new Proton.Velocity(new Proton.Span(1, 5), new Proton.Vector3D(0, 1, 0), 30));

        // 重力
        emitter.addBehaviour(new Proton.Gravity(0));
        // alpha动画
        emitter.addBehaviour(new Proton.Alpha(1, 1));
        // 缩放动画
        emitter.addBehaviour(new Proton.Scale(1.0, 0));
        // 颜色动画
        emitter.addBehaviour(new Proton.Color("#fff", "#fff"));

        // 粒子随机x,y,z移动
        //emitter.addBehaviour(new Proton.RandomDrift(0.01, 0.01, 0.01, .05));
        emitter.p.x = 0;
        emitter.p.y = 0;
        emitter.p.z = 0;
        emitter.emit();
        
        newProton.addEmitter(emitter);
        this.spriteRender = new Proton.SpriteRender(this);
        newProton.addRender(this.spriteRender);

        this.emitter = emitter;
        this.proton = newProton;
        this.particleContainer = new THREE.Group();
        this.add(this.particleContainer);
        
        if (json)
        this.initFromJson(json);
        
    }
    destroy() {
        this.parent.remove(this);
    }
    update(dt) {
        if (this.proton) {
            this.proton.update(dt);
        }
    }
    toJson() {
        return this.json;
    }
    loadFromUrl(url) {
        this.jsonLoader.load(url, (result) => {
            var jsonObj = JSON.parse(result);
            this.initFromJson(jsonObj);
        });
    }
    initFromJson(json) {
        this.json = json;
        this.particleContainer.position.fromArray(json.position);
        this.updateRate(json.minEmitNumber, json.maxEmitNumber, json.minEmitTime, json.maxEmitTime);
        this.updateRadius(json.minRadius, json.maxRadius);
        this.updateLife(json.minLife, json.maxLife);
        this.updateMass(json.minMass, json.maxMass);
        this.configInitPosition(json.initPositionSet);
        this.updateVelocity(json.velocity.dir, json.velocity.minSpeed, json.velocity.maxSpeed, json.velocity.tha);
        this.updateGravity(json.gravity);
        this.updateAlphaAnimationStartAndEnd(json.alphaStart, json.alphaEnd);
        this.updateScaleAnimationStartAndEnd(json.scaleStart, json.scaleEnd);
        this.updateColorAnimation(json.startColor, json.endColor, json.isStartColorRandom, json.isEndColorRandom,  json.enableEndColor);
    }
    updateColorAnimation(startColor, endColor, isStartColorRandom, isEndColorRandom, enableEndColor) {
        this.json.startColor = startColor;
        this.json.endColor = endColor;
        this.json.isStartColorRandom = isStartColorRandom;
        this.json.isEndColorRandom = isEndColorRandom;
        this.json.enableEndColor = enableEndColor;
        let index = this.emitter.behaviours.findIndex( (behaviour) => {
            return behaviour instanceof Proton.Color;
        })
        let colorBehaviour = this.emitter.behaviours[index];
        if (colorBehaviour) {
            if (enableEndColor) {
                colorBehaviour.reset(isStartColorRandom ? "random" : startColor, isEndColorRandom ? "random" : endColor);
            } else {
                colorBehaviour.reset(isStartColorRandom ? "random" : startColor);
            }
        }
    }
    updateScaleAnimationStartAndEnd(s, e) {
        this.json.scaleStart = s;
        this.json.scaleEnd = e;
        let index = this.emitter.behaviours.findIndex( (behaviour) => {
            return behaviour instanceof Proton.Scale;
        })
        let alphaBehaviour = this.emitter.behaviours[index];
        if (alphaBehaviour) {
            alphaBehaviour.reset(s, e);
        }
    }
    updateAlphaAnimationStartAndEnd(s, e) {
        this.json.alphaStart = s;
        this.json.alphaEnd = e;
        let behaviour = this.emitter.behaviours.find( (behaviour) => {
            return behaviour instanceof Proton.Alpha;
        })
        if (behaviour) {
            behaviour.reset(s, e);
        }
    }
    updateGravity(gravity) {
        this.json.gravity = gravity;
        this.emitter.behaviours.forEach((behaviour) => {
            if (behaviour instanceof Proton.Gravity) {
                behaviour.reset(gravity);
            }
        });
    }
    updateVelocity(dir, minSpeed, maxSpeed, tha) {
        this.json.velocity.dir = dir;
        this.json.velocity.minSpeed = minSpeed;
        this.json.velocity.maxSpeed = maxSpeed;
        this.json.velocity.tha = tha;
        this.emitter.initializes.forEach((initialize) => {
            if (initialize instanceof Proton.Velocity) {
                initialize.reset(new Proton.Span(minSpeed, maxSpeed), new Proton.Vector3D(dir[0], dir[1], dir[2]), tha);
            }
        });
    }
    configInitPosition(initPositionSet) {
        this.initPositionSet = new Proton.Position();
        initPositionSet.forEach( (initPos) => {
            this.addInitPositionZone(initPos);
        })
        this.emitter.addInitialize(this.initPositionSet);
    }
    removeInitPositionZone(i) {
        this.initPositionSet.removeZone(this.initPositionSet.zones[i]);
    }
    addInitPositionZone(initPos) {
        if (initPos.type == "point") {
            let newZone = new Proton.PointZone().fromJson(initPos);
            this.initPositionSet.addZone(newZone);
            // Proton.Debug.drawZone(this.proton, this, newZone);
        } else if (initPos.type == "line") {
            let newZone = new Proton.LineZone().fromJson(initPos);
            this.initPositionSet.addZone(newZone);
        } else if (initPos.type == "box") {
            let newZone = new Proton.BoxZone().fromJson(initPos);
            this.initPositionSet.addZone(newZone);
           // Proton.Debug.drawZone(this.proton, this, newZone);
        } else if (initPos.type == "sphere") {
            let newZone = new Proton.SphereZone().fromJson(initPos);
            this.initPositionSet.addZone(newZone);
          //  Proton.Debug.drawZone(this.proton, this, newZone);
        }
    }
    updateRate(minEmitNumber, maxEmitNumber, minEmitTime, maxEmitTime) {
        this.json.minEmitNumber = minEmitNumber;
        this.json.maxEmitNumber = maxEmitNumber;
        this.json.minEmitTime = minEmitTime;
        this.json.maxEmitTime = maxEmitTime;
        this.emitter.rate = new Proton.Rate(new Proton.Span(minEmitNumber, maxEmitNumber), new Proton.Span(minEmitTime, maxEmitTime));
    }
    updateRadius(minRadius, maxRadius) {
        this.json.minRadius = minRadius;
        this.json.maxRadius = maxRadius;
        this.emitter.initializes.forEach((initialize) => {
            if (initialize instanceof Proton.Radius) {
                initialize.reset(minRadius, maxRadius);
            }
        });
    }
    updateLife(minLife, maxLife) {
        this.json.minLife = minLife;
        this.json.maxLife = maxLife;
        this.emitter.initializes.forEach((initialize) => {
            if (initialize instanceof Proton.Life) {
                initialize.reset(minLife, maxLife);
            }
        });
    }
    updateMass(minMass, maxMass) {
        this.json.minMass = minMass;
        this.json.maxMass = maxMass;
        this.emitter.initializes.forEach((initialize) => {
            if (initialize instanceof Proton.Mass) {
                initialize.reset(minMass, maxMass);
            }
        });
    }
    changeMap(map) {
        this.defaultMaterial.map = map;
        this.defaultSprite.material.map = map;
        this.emitter.initializes.forEach((initialize) => {
            if (initialize instanceof Proton.Body) {
                initialize.body = Proton.createArraySpan(this.defaultSprite);
            }
        });
        this.proton.pool.destroy();
        this.emitter.destroyAllParticles();
        this.spriteRender.destroyPool();

    }
}