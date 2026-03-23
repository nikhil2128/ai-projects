/**
 * Test data factories for creating mock objects used across all tests.
 */
import type {
  User,
  UserSummary,
  Annotation,
  Comment,
  Image,
  ImageDetail,
  AnnotationStatus,
  ShapeType,
  RectangleData,
  FreehandData,
} from '../types';

// ---------- Counters for unique IDs ----------

let idCounter = 0;
function nextId(prefix = 'id'): string {
  return `${prefix}-${++idCounter}`;
}

export function resetIdCounter() {
  idCounter = 0;
}

// ---------- Users ----------

export function createUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? nextId('user');
  return {
    id,
    email: `${id}@test.com`,
    name: `Test User ${id}`,
    role: 'ENGINEER',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createUserSummary(overrides: Partial<UserSummary> = {}): UserSummary {
  const id = overrides.id ?? nextId('user');
  return {
    id,
    name: `Test User ${id}`,
    role: 'ENGINEER',
    ...overrides,
  };
}

// Predefined users for multi-user scenarios
export const adminUser = createUser({
  id: 'admin-1',
  email: 'admin@factory.com',
  name: 'Admin User',
  role: 'ADMIN',
});

export const engineerUser = createUser({
  id: 'engineer-1',
  email: 'engineer@factory.com',
  name: 'Engineer User',
  role: 'ENGINEER',
});

export const workerUser = createUser({
  id: 'worker-1',
  email: 'worker@factory.com',
  name: 'Factory Worker',
  role: 'FACTORY_WORKER',
});

export const procurementUser = createUser({
  id: 'procurement-1',
  email: 'procurement@factory.com',
  name: 'Procurement User',
  role: 'PROCUREMENT',
});

// ---------- Comments ----------

export function createComment(overrides: Partial<Comment> & { authorId?: string } = {}): Comment {
  const id = overrides.id ?? nextId('comment');
  const authorId = overrides.authorId ?? nextId('user');
  return {
    id,
    annotationId: nextId('annotation'),
    authorId,
    body: `Test comment ${id}`,
    author: createUserSummary({ id: authorId }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------- Annotations ----------

export function createCircleAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  const id = overrides.id ?? nextId('annotation');
  const authorId = overrides.authorId ?? nextId('user');
  return {
    id,
    imageId: nextId('image'),
    authorId,
    centerX: 50,
    centerY: 50,
    radius: 10,
    shapeType: 'CIRCLE',
    shapeData: null,
    color: '#EF4444',
    label: `Annotation ${id}`,
    status: 'OPEN',
    author: createUserSummary({ id: authorId }),
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createRectangleAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  const rectData: RectangleData = { x: 20, y: 20, width: 30, height: 20 };
  return createCircleAnnotation({
    shapeType: 'RECTANGLE',
    shapeData: rectData,
    centerX: 35,
    centerY: 30,
    radius: 0,
    ...overrides,
  });
}

export function createFreehandAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  const freehandData: FreehandData = {
    points: [
      { x: 10, y: 10 },
      { x: 20, y: 15 },
      { x: 30, y: 10 },
      { x: 25, y: 25 },
      { x: 15, y: 20 },
    ],
  };
  return createCircleAnnotation({
    shapeType: 'FREEHAND',
    shapeData: freehandData,
    centerX: 20,
    centerY: 17.5,
    radius: 0,
    ...overrides,
  });
}

export function createAnnotation(
  shapeType: ShapeType = 'CIRCLE',
  overrides: Partial<Annotation> = {}
): Annotation {
  switch (shapeType) {
    case 'RECTANGLE':
      return createRectangleAnnotation(overrides);
    case 'FREEHAND':
      return createFreehandAnnotation(overrides);
    default:
      return createCircleAnnotation(overrides);
  }
}

// ---------- Annotations with comments (for thread testing) ----------

export function createAnnotationWithComments(
  commentCount: number,
  overrides: Partial<Annotation> = {}
): Annotation {
  const annotationId = overrides.id ?? nextId('annotation');
  const comments: Comment[] = Array.from({ length: commentCount }, (_, i) =>
    createComment({
      id: `comment-${annotationId}-${i + 1}`,
      annotationId,
      authorId: i % 2 === 0 ? engineerUser.id : workerUser.id,
      author: i % 2 === 0
        ? createUserSummary({ id: engineerUser.id, name: engineerUser.name, role: engineerUser.role })
        : createUserSummary({ id: workerUser.id, name: workerUser.name, role: workerUser.role }),
      body: `Comment ${i + 1} on annotation ${annotationId}`,
      createdAt: new Date(Date.now() - (commentCount - i) * 60000).toISOString(),
    })
  );

  return createCircleAnnotation({
    id: annotationId,
    comments,
    ...overrides,
  });
}

// ---------- Images ----------

export function createImage(overrides: Partial<Image> = {}): Image {
  const id = overrides.id ?? nextId('image');
  return {
    id,
    title: `Test Image ${id}`,
    description: `Description for ${id}`,
    filename: `${id}.jpg`,
    originalName: `original-${id}.jpg`,
    mimeType: 'image/jpeg',
    fileSize: 1024 * 1024,
    width: 1920,
    height: 1080,
    storageKey: `storage/${id}.jpg`,
    thumbnailKey: `thumbnails/${id}.jpg`,
    uploaderId: nextId('user'),
    uploader: createUserSummary(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createImageDetail(overrides: Partial<ImageDetail> = {}): ImageDetail {
  const id = overrides.id ?? nextId('image');
  return {
    ...createImage({ id, ...overrides }),
    annotations: overrides.annotations ?? [],
    ...overrides,
  };
}

// ---------- Complex scenarios ----------

/**
 * Creates a full image detail with multiple annotations and comments,
 * simulating a multi-user collaboration scenario.
 */
export function createMultiUserImageScene(): {
  image: ImageDetail;
  users: { admin: User; engineer: User; worker: User; procurement: User };
} {
  const ann1 = createAnnotationWithComments(3, {
    id: 'ann-1',
    authorId: engineerUser.id,
    author: createUserSummary({ id: engineerUser.id, name: engineerUser.name, role: engineerUser.role }),
    shapeType: 'CIRCLE',
    status: 'OPEN',
    label: 'Scratch on surface',
  });

  const ann2 = createAnnotationWithComments(2, {
    id: 'ann-2',
    authorId: workerUser.id,
    author: createUserSummary({ id: workerUser.id, name: workerUser.name, role: workerUser.role }),
    shapeType: 'RECTANGLE',
    shapeData: { x: 10, y: 10, width: 25, height: 15 } as RectangleData,
    status: 'RESOLVED',
    label: 'Dent near edge',
  });

  const ann3 = createCircleAnnotation({
    id: 'ann-3',
    authorId: procurementUser.id,
    author: createUserSummary({ id: procurementUser.id, name: procurementUser.name, role: procurementUser.role }),
    shapeType: 'FREEHAND',
    shapeData: {
      points: [
        { x: 60, y: 40 },
        { x: 70, y: 45 },
        { x: 75, y: 55 },
        { x: 65, y: 50 },
      ],
    } as FreehandData,
    status: 'DISMISSED',
    label: 'Discoloration area',
    comments: [],
  });

  const image = createImageDetail({
    id: 'image-1',
    title: 'Quality Check - Part #A2847',
    uploaderId: engineerUser.id,
    uploader: createUserSummary({ id: engineerUser.id, name: engineerUser.name, role: engineerUser.role }),
    annotations: [ann1, ann2, ann3],
  });

  return {
    image,
    users: {
      admin: adminUser,
      engineer: engineerUser,
      worker: workerUser,
      procurement: procurementUser,
    },
  };
}
