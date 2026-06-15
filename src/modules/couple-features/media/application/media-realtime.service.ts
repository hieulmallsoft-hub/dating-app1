import { Injectable } from "@nestjs/common";

export type MediaChangeType = "created" | "updated" | "deleted";

export type MediaChangeEvent = {
  changed: true;
  version: number;
  coupleId: string;
  type: MediaChangeType;
  mediaId: string;
  actorId: string;
  at: string;
};

export type MediaChangeResponse =
  | MediaChangeEvent
  | {
      changed: false;
      version: number;
    };

type ChangeListener = (event: MediaChangeEvent) => void;

@Injectable()
export class MediaRealtimeService {
  private readonly versions = new Map<string, number>();
  private readonly lastEvents = new Map<string, MediaChangeEvent>();
  private readonly waiters = new Map<string, Set<ChangeListener>>();

  getVersion(coupleId: string): number {
    return this.versions.get(coupleId) ?? 0;
  }

  notify(change: {
    coupleId: string;
    type: MediaChangeType;
    mediaId: string;
    actorId: string;
  }): MediaChangeEvent {
    const nextVersion = this.getVersion(change.coupleId) + 1;
    this.versions.set(change.coupleId, nextVersion);

    const event: MediaChangeEvent = {
      changed: true,
      version: nextVersion,
      coupleId: change.coupleId,
      type: change.type,
      mediaId: change.mediaId,
      actorId: change.actorId,
      at: new Date().toISOString(),
    };

    this.lastEvents.set(change.coupleId, event);

    const listeners = this.waiters.get(change.coupleId);
    if (listeners?.size) {
      this.waiters.delete(change.coupleId);
      for (const listener of listeners) {
        listener(event);
      }
    }

    return event;
  }

  waitForChange(coupleId: string, sinceVersion: number, timeoutMs: number): Promise<MediaChangeResponse> {
    const currentVersion = this.getVersion(coupleId);
    if (currentVersion > sinceVersion) {
      const lastEvent = this.lastEvents.get(coupleId);
      if (lastEvent && lastEvent.version === currentVersion) {
        return Promise.resolve(lastEvent);
      }
      return Promise.resolve({
        changed: false,
        version: currentVersion,
      });
    }

    return new Promise<MediaChangeResponse>((resolve) => {
      const listeners = this.waiters.get(coupleId) ?? new Set<ChangeListener>();

      let settled = false;
      let timer: NodeJS.Timeout;

      const finish = (result: MediaChangeResponse) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        listeners.delete(onChange);
        if (!listeners.size) {
          this.waiters.delete(coupleId);
        } else {
          this.waiters.set(coupleId, listeners);
        }
        resolve(result);
      };

      const onChange: ChangeListener = (event) => {
        finish(event);
      };

      listeners.add(onChange);
      this.waiters.set(coupleId, listeners);

      timer = setTimeout(() => {
        finish({
          changed: false,
          version: this.getVersion(coupleId),
        });
      }, timeoutMs);
    });
  }
}
