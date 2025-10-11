import type { Participant, TrackPublication } from 'livekit-client';
import { LocalParticipant, Room, RoomEvent } from 'livekit-client';
import { Observable } from 'rxjs';
import type { RoomEventCallbacks } from 'livekit-client/dist/src/room/Room';
export declare function observeRoomEvents(room: Room, ...events: RoomEvent[]): Observable<Room>;
export declare function roomEventSelector<T extends RoomEvent>(room: Room, event: T): Observable<Parameters<RoomEventCallbacks[T]>>;
export declare function roomObserver(room: Room): Observable<Room>;
export declare function connectionStateObserver(room: Room): Observable<import("livekit-client").ConnectionState>;
export type ScreenShareTrackMap = Array<{
    participant: Participant;
    tracks: Array<TrackPublication>;
}>;
export declare function screenShareObserver(room: Room): Observable<ScreenShareTrackMap>;
export declare function roomInfoObserver(room: Room): Observable<{
    name: string;
    metadata: string | undefined;
}>;
export declare function activeSpeakerObserver(room: Room): Observable<Participant[]>;
export declare function createMediaDeviceObserver(kind?: MediaDeviceKind, onError?: (e: Error) => void, requestPermissions?: boolean): Observable<MediaDeviceInfo[]>;
export declare function createDataObserver(room: Room): Observable<[payload: Uint8Array<ArrayBufferLike>, participant?: import("livekit-client").RemoteParticipant | undefined, kind?: import("livekit-client").DataPacket_Kind | undefined, topic?: string | undefined]>;
export declare function createChatObserver(room: Room): Observable<[message: import("livekit-client").ChatMessage, participant?: LocalParticipant | import("livekit-client").RemoteParticipant | undefined]>;
export declare function roomAudioPlaybackAllowedObservable(room: Room): Observable<{
    canPlayAudio: boolean;
}>;
export declare function roomVideoPlaybackAllowedObservable(room: Room): Observable<{
    canPlayVideo: boolean;
}>;
export declare function createActiveDeviceObservable(room: Room, kind: MediaDeviceKind): Observable<string>;
export declare function encryptionStatusObservable(room: Room, participant: Participant | undefined): Observable<boolean>;
export declare function recordingStatusObservable(room: Room): Observable<boolean>;
//# sourceMappingURL=room.d.ts.map