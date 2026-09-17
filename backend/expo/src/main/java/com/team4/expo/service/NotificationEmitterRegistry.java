package com.team4.expo.service;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class NotificationEmitterRegistry {

    private static final long TIMEOUT = 30 * 60 * 1000L; // 30분. 초과시 클라이언트 재연결

    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    // emitter는 내보내는 애라는 뜻으로 하나의 연결을 붙잡고 있다가 이벤트가 생기면 그 연결로 데이터를 흘려보내는 객체를 통칭하는 이름.
    // SseEmitter는 Spring이 제공하는 구현체로 클라이언트 하나와의 HTTP 연결을 계속 열어둔 채로 응답을 스레드가 즉시 끝내지 않고
    // 나중에 send()를 호출할 때마다 그 연결에 이벤트를 하나씩 흘려보낼 수 있게 해주는 객체
    public SseEmitter subscribe(Long recipientId){
        SseEmitter emitter = new SseEmitter(TIMEOUT);

        // 이 사용자의 emitter 리스트가 없으면 만들고, 있으면 그거 쓰고, 거기에 새 emitter 추가
        emitters.computeIfAbsent(recipientId, id -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> remove(recipientId, emitter)); // 클라이언트가 정상적으로 연결 끊었을 때
        emitter.onTimeout(() -> remove(recipientId, emitter)); // TIMEOUT 상수값 즉, 30분이 지났을 때
        emitter.onError(e -> remove(recipientId, emitter)); // 전송 중 에러 발생 시

        try {
            emitter.send(SseEmitter.event().comment("connected")); // 연결 직후 바로 흘려보내서 프록시가 응답 버퍼링 안 하게 함
        } catch (IOException e) {
            remove(recipientId, emitter);
        }
        return emitter;
    }

    // 리스트 순회하면서 각 emitter에 알림 전송
    public void push(Long recipientId, Object payload) {
        List<SseEmitter> list = emitters.get(recipientId);
        if (list == null) {
            return;
        }
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(payload));
            } catch (IOException e) { // 클라이언트가 끊기면
                remove(recipientId, emitter); // 그 emitter만 제거
            }
        }
    }

    // 리스트에서 해당 emitter 제거
    private void remove(Long recipientId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(recipientId);
        if (list == null) {
            return;
        }
        list.remove(emitter);
        if (list.isEmpty()) { // 한 사용자의 emitter 리스트가 비었다면
            emitters.remove(recipientId); // 맵 key 자체를 제거
        }
    }
}
