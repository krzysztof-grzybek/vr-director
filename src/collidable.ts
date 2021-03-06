import { DetailEvent, Entity, EntityEventMap, registerComponent, THREE } from 'aframe';
import { ComponentDef } from './utils';

export type CollideEvent = DetailEvent<{ relatedTarget: Entity }>

declare module 'aframe' {
  interface EntityEventMap {
    "collide": CollideEvent;
  }
}

interface CollideComponent {
  collided: Entity[];
  entities: Entity[];

  initCollisions: () => void;
  getCollidableEntities: () => Entity[];
  areIntersected: (a: Entity, b: Entity) => boolean;
  handleCollision: (e: Entity) => void;
  handleCollisionEnd: (e: Entity) => void;
}

const componentDef: ComponentDef<CollideComponent, { ids: string[] }> = {
  schema: {
    ids: {
      type: 'array',
      default: [],
    }
  },
  entities: [],
  collided: [],

  init() {
    this.el.sceneEl!.addEventListener('loaded', this.initCollisions.bind(this));
  },

  initCollisions() {
    this.entities = this.getCollidableEntities();
  },

  getCollidableEntities() {
    const collidableEls = Array.from(this.el.sceneEl!.querySelectorAll<Entity>('[collidable]'));
    return collidableEls
      .filter(el => el !== this.el)
  },

  tick() {
    const intersected = this.entities.filter(entity => this.areIntersected(this.el, entity));

    this.entities.forEach(entity => {
      if (intersected.includes(entity) && !this.collided.includes(entity)) {
        this.handleCollision(entity);
      } else if (!intersected.includes(entity) && this.collided.includes(entity)) {
        this.handleCollisionEnd(entity);
      }
    });
  },

  areIntersected(first: Entity, second: Entity) {
    // TODO: assert if is Mesh with sphere
    const firstMesh: THREE.Mesh = first.getObject3D('mesh') as THREE.Mesh;
    const firstGeometry = firstMesh.geometry;

    // TODO: assert if is Mesh with sphere
    const secondMesh: THREE.Mesh = second.getObject3D('mesh') as THREE.Mesh;
    const secondGeometry = secondMesh.geometry;

    firstGeometry.computeBoundingSphere();
    secondGeometry.computeBoundingSphere();

    const maxDistance = firstGeometry.boundingSphere.radius + secondGeometry.boundingSphere.radius;
    const firstMeshWorldPos = new THREE.Vector3();
    const secondMeshWorldPos = new THREE.Vector3();
    firstMesh.getWorldPosition(firstMeshWorldPos);
    secondMesh.getWorldPosition(secondMeshWorldPos);
    const realDistance = firstMeshWorldPos.distanceTo(secondMeshWorldPos);

    return realDistance < maxDistance;
  },

  handleCollision(target: Entity) {
    this.collided.push(target);
    this.el.emit('collide', { target })
  },

  handleCollisionEnd(target: Entity) {
    const index = this.collided.indexOf(target);
    this.collided.splice(index, 1);
  }
};

registerComponent('collidable', componentDef);
