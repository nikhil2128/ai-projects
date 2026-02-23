import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

export interface UserSearchDoc {
  id: number;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followersCount?: number;
}

const INDEX_NAME = 'users';

@Injectable()
export class SearchService implements OnModuleInit {
  private client!: Client;
  private readonly logger = new Logger(SearchService.name);
  private enabled = true;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('ELASTICSEARCH_URL');
    if (!url) {
      this.enabled = false;
      this.logger.warn('Elasticsearch URL not configured — search will fall back to database');
      return;
    }

    this.client = new Client({ node: url });

    try {
      const exists = await this.client.indices.exists({ index: INDEX_NAME });
      if (!exists) {
        await this.client.indices.create({
          index: INDEX_NAME,
          body: {
            settings: {
              number_of_shards: 5,
              number_of_replicas: 1,
              analysis: {
                analyzer: {
                  username_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'edge_ngram_filter'],
                  },
                  username_search: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase'],
                  },
                },
                filter: {
                  edge_ngram_filter: {
                    type: 'edge_ngram',
                    min_gram: 1,
                    max_gram: 20,
                  },
                },
              },
            },
            mappings: {
              properties: {
                id: { type: 'long' },
                username: {
                  type: 'text',
                  analyzer: 'username_analyzer',
                  search_analyzer: 'username_search',
                  fields: { keyword: { type: 'keyword' } },
                },
                displayName: {
                  type: 'text',
                  analyzer: 'username_analyzer',
                  search_analyzer: 'username_search',
                  fields: { keyword: { type: 'keyword' } },
                },
                bio: { type: 'text' },
                avatarUrl: { type: 'keyword', index: false },
                followersCount: { type: 'integer' },
                suggest: {
                  type: 'completion',
                  analyzer: 'simple',
                },
              },
            },
          },
        });
        this.logger.log('Created Elasticsearch users index with edge n-gram analyzer');
      }
    } catch (err) {
      this.logger.error('Failed to initialize Elasticsearch', err);
      this.enabled = false;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async indexUser(user: UserSearchDoc): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.client.index({
        index: INDEX_NAME,
        id: String(user.id),
        document: {
          ...user,
          suggest: {
            input: [user.username, user.displayName].filter(Boolean),
          },
        },
      });
    } catch (err) {
      this.logger.error(`Failed to index user ${user.id}`, err);
    }
  }

  async removeUser(userId: number): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.client.delete({ index: INDEX_NAME, id: String(userId) });
    } catch (err) {
      this.logger.error(`Failed to remove user ${userId} from index`, err);
    }
  }

  async search(query: string, limit = 20, offset = 0): Promise<UserSearchDoc[]> {
    if (!this.enabled) return [];
    try {
      const result = await this.client.search<UserSearchDoc>({
        index: INDEX_NAME,
        body: {
          from: offset,
          size: limit,
          query: {
            bool: {
              should: [
                {
                  multi_match: {
                    query,
                    fields: ['username^3', 'displayName^2', 'bio'],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                  },
                },
                {
                  prefix: {
                    'username.keyword': { value: query.toLowerCase(), boost: 5 },
                  },
                },
              ],
            },
          },
          sort: [{ _score: 'desc' }, { followersCount: 'desc' }],
        },
      });

      return result.hits.hits
        .map((hit) => hit._source)
        .filter((s): s is UserSearchDoc => s !== undefined);
    } catch (err) {
      this.logger.error('Search query failed', err);
      return [];
    }
  }

  async suggest(prefix: string, limit = 5): Promise<UserSearchDoc[]> {
    if (!this.enabled) return [];
    try {
      const result = await this.client.search<UserSearchDoc>({
        index: INDEX_NAME,
        body: {
          suggest: {
            user_suggest: {
              prefix,
              completion: {
                field: 'suggest',
                size: limit,
                skip_duplicates: true,
              },
            },
          },
        },
      });

      const suggestions = result.suggest?.user_suggest?.[0]?.options ?? [];
      return suggestions
        .map((opt: { _source?: UserSearchDoc }) => opt._source)
        .filter((s: UserSearchDoc | undefined): s is UserSearchDoc => s !== undefined);
    } catch (err) {
      this.logger.error('Suggest query failed', err);
      return [];
    }
  }
}
