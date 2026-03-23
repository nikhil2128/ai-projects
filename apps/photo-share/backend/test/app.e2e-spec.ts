import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { PostsController } from '../src/posts/posts.controller';
import { PostsService } from '../src/posts/posts.service';
import { FollowsController } from '../src/follows/follows.controller';
import { FollowsService } from '../src/follows/follows.service';
import { ReactionsController } from '../src/reactions/reactions.controller';
import { ReactionsService } from '../src/reactions/reactions.service';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

jest.mock('../src/auth/jwt-auth.guard', () => ({
  JwtAuthGuard: class {
    canActivate(context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }) {
      context.switchToHttp().getRequest().user = { id: 1, username: 'alice' };
      return true;
    }
  },
}));

describe('PhotoShare API (e2e)', () => {
  let app: INestApplication;

  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
  };
  const postsService = {
    create: jest.fn(),
    getFeed: jest.fn(),
    getUserPosts: jest.fn(),
    findOne: jest.fn(),
    deletePost: jest.fn(),
  };
  const followsService = {
    follow: jest.fn(),
    unfollow: jest.fn(),
    getFollowers: jest.fn(),
    getFollowing: jest.fn(),
  };
  const reactionsService = {
    toggleReaction: jest.fn(),
    getPostReactions: jest.fn(),
  };
  const usersService = {
    searchUsers: jest.fn(),
    findByUsername: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        PostsController,
        FollowsController,
        ReactionsController,
        UsersController,
      ],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: PostsService, useValue: postsService },
        { provide: FollowsService, useValue: followsService },
        { provide: ReactionsService, useValue: reactionsService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('register endpoint delegates to auth service', async () => {
    authService.register.mockResolvedValue({ accessToken: 't' });

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username: 'alice', email: 'a@x.com', password: 'secret1' })
      .expect(201)
      .expect({ accessToken: 't' });
  });

  it('login endpoint delegates to auth service', async () => {
    authService.login.mockResolvedValue({ accessToken: 't' });
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'secret1' })
      .expect(201);
  });

  it('me endpoint uses user from auth guard', async () => {
    authService.getProfile.mockResolvedValue({ id: 1, username: 'alice' });
    await request(app.getHttpServer()).get('/api/auth/me').expect(200);
    expect(authService.getProfile).toHaveBeenCalledWith(1);
  });

  it('posts feed endpoint parses query page', async () => {
    postsService.getFeed.mockResolvedValue({ posts: [], total: 0, page: 2, totalPages: 0 });
    await request(app.getHttpServer()).get('/api/posts/feed?page=2').expect(200);
    expect(postsService.getFeed).toHaveBeenCalledWith(1, 2);
  });

  it('posts create rejects missing image', async () => {
    await request(app.getHttpServer())
      .post('/api/posts')
      .field('caption', 'x')
      .expect(400);
  });

  it('reactions toggle endpoint delegates with parsed postId', async () => {
    reactionsService.toggleReaction.mockResolvedValue({ action: 'added', emoji: '🔥' });
    await request(app.getHttpServer())
      .post('/api/posts/12/reactions')
      .send({ emoji: '🔥' })
      .expect(201);
    expect(reactionsService.toggleReaction).toHaveBeenCalledWith(1, 12, '🔥');
  });

  it('follows endpoint delegates to follow service', async () => {
    followsService.follow.mockResolvedValue({ message: 'Now following bob' });
    await request(app.getHttpServer()).post('/api/follows/bob').expect(201);
    expect(followsService.follow).toHaveBeenCalledWith(1, 'bob');
  });

  it('users search endpoint delegates query', async () => {
    usersService.searchUsers.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/api/users/search?q=a').expect(200);
    expect(usersService.searchUsers).toHaveBeenCalledWith('a');
  });
});
