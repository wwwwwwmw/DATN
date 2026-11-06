"""
Simulated Annealing — Tối ưu hóa lịch hẹn khám bệnh.

Thuật toán SA (Simulated Annealing) được sử dụng để tìm khung giờ
khám tối ưu nhất cho bệnh nhân, dựa trên nhiều tiêu chí:
  1. Khoảng cách từ bệnh nhân đến phòng khám
  2. Mức độ bận rộn của khung giờ (ít bệnh nhân = tốt hơn)
  3. Khung giờ ưa thích của bệnh nhân
  4. Thời gian chờ đợi dự kiến
"""
import math
import random
import time
from dataclasses import dataclass
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance


@dataclass
class SAConfig:
    """Tham số Simulated Annealing."""
    initial_temperature: float = 1000.0
    cooling_rate: float = 0.995
    min_temperature: float = 0.01
    max_iterations: int = 1000

    # Trọng số cho các tiêu chí (tổng = 1.0)
    weight_distance: float = 0.30
    weight_occupancy: float = 0.30
    weight_time_preference: float = 0.25
    weight_wait_time: float = 0.15


def objective_function(slot, patient_location=None, preferred_time=None, config=None):
    """
    Hàm mục tiêu — score càng CAO càng TỐT (maximize).

    Args:
        slot: TimeSlot object (with distance annotation if available)
        patient_location: Point(lng, lat) hoặc None
        preferred_time: time object (giờ bệnh nhân muốn)
        config: SAConfig

    Returns:
        float: Score [0, 1]
    """
    if config is None:
        config = SAConfig()

    scores = {}

    # 1. Distance score: càng gần càng tốt (normalize 0-1)
    if patient_location and hasattr(slot, 'distance') and slot.distance:
        dist_km = slot.distance.km
        # Sigmoid-like: 0km = 1.0, 5km = 0.5, 10km+ ≈ 0
        scores['distance'] = 1.0 / (1.0 + (dist_km / 3.0) ** 2)
    else:
        scores['distance'] = 0.5  # neutral nếu không có location

    # 2. Occupancy score: slot ít bệnh nhân = tốt hơn
    if slot.max_patients > 0:
        occupancy_ratio = slot.current_patients / slot.max_patients
        scores['occupancy'] = 1.0 - occupancy_ratio
    else:
        scores['occupancy'] = 0.0

    # 3. Time preference: gần giờ mong muốn = tốt hơn
    if preferred_time:
        # Chênh lệch giờ (đổi về phút)
        slot_minutes = slot.start_time.hour * 60 + slot.start_time.minute
        pref_minutes = preferred_time.hour * 60 + preferred_time.minute
        diff_minutes = abs(slot_minutes - pref_minutes)
        # Normalize: 0 phút = 1.0, 120 phút = 0.5, 240+ phút ≈ 0
        scores['time_preference'] = 1.0 / (1.0 + (diff_minutes / 60.0) ** 2)
    else:
        scores['time_preference'] = 0.5

    # 4. Wait time: slot buổi sáng sớm thường ít chờ hơn
    slot_hour = slot.start_time.hour
    if 7 <= slot_hour <= 9:
        scores['wait_time'] = 0.9  # Giờ vàng
    elif 9 < slot_hour <= 11:
        scores['wait_time'] = 0.7
    elif 13 <= slot_hour <= 14:
        scores['wait_time'] = 0.8  # Đầu chiều
    elif 14 < slot_hour <= 16:
        scores['wait_time'] = 0.6
    else:
        scores['wait_time'] = 0.5

    # Weighted sum
    total_score = (
        config.weight_distance * scores['distance']
        + config.weight_occupancy * scores['occupancy']
        + config.weight_time_preference * scores['time_preference']
        + config.weight_wait_time * scores['wait_time']
    )

    return total_score, scores


def simulated_annealing(available_slots, patient_location=None, preferred_time=None, config=None):
    """
    Chạy Simulated Annealing để xếp hạng các khung giờ.

    Args:
        available_slots: list[TimeSlot] — các slot còn trống
        patient_location: Point(lng, lat) hoặc None
        preferred_time: time object hoặc None
        config: SAConfig hoặc None (dùng default)

    Returns:
        list[dict]: Slots được xếp hạng theo SA score
            [{'slot': TimeSlot, 'score': float, 'details': dict, 'is_recommended': bool}, ...]
    """
    if config is None:
        config = SAConfig()

    if not available_slots:
        return []

    start_time = time.time()

    # Tính score cho tất cả slots
    slot_scores = []
    for slot in available_slots:
        score, details = objective_function(
            slot, patient_location, preferred_time, config
        )
        slot_scores.append({
            'slot': slot,
            'score': score,
            'details': details,
        })

    # SA optimization: tìm thứ tự tối ưu
    n = len(slot_scores)
    if n <= 1:
        if slot_scores:
            slot_scores[0]['is_recommended'] = True
        return slot_scores

    # Initial solution: sắp xếp theo score giảm dần
    current_order = sorted(range(n), key=lambda i: slot_scores[i]['score'], reverse=True)
    current_energy = _calculate_energy(slot_scores, current_order)
    best_order = current_order.copy()
    best_energy = current_energy

    temperature = config.initial_temperature
    iteration = 0

    while temperature > config.min_temperature and iteration < config.max_iterations:
        # Tạo neighbor: swap 2 vị trí ngẫu nhiên
        new_order = current_order.copy()
        i, j = random.sample(range(n), 2)
        new_order[i], new_order[j] = new_order[j], new_order[i]

        new_energy = _calculate_energy(slot_scores, new_order)
        delta_energy = new_energy - current_energy

        # Accept or reject
        if delta_energy < 0:  # better solution
            current_order = new_order
            current_energy = new_energy
        else:
            # Accept worse solution with probability
            acceptance_prob = math.exp(-delta_energy / temperature)
            if random.random() < acceptance_prob:
                current_order = new_order
                current_energy = new_energy

        # Track best
        if current_energy < best_energy:
            best_order = current_order.copy()
            best_energy = current_energy

        # Cool down
        temperature *= config.cooling_rate
        iteration += 1

    # Reorder results by best SA order
    result = [slot_scores[i] for i in best_order]

    # Mark top recommendation
    for i, item in enumerate(result):
        item['is_recommended'] = (i == 0)
        # Generate reasons
        item['reasons'] = _generate_reasons(item['details'])

    computation_time = (time.time() - start_time) * 1000  # ms

    return result, {
        'algorithm': 'simulated_annealing',
        'iterations': iteration,
        'final_temperature': round(temperature, 6),
        'computation_time_ms': round(computation_time, 2),
    }


def _calculate_energy(slot_scores, order):
    """
    Tính năng lượng (energy) — càng thấp càng tốt.
    Energy = negative weighted sum (để SA minimize).
    """
    energy = 0.0
    for rank, idx in enumerate(order):
        # Penalty cho slot có score cao nhưng rank thấp
        position_weight = 1.0 / (rank + 1)  # vị trí đầu quan trọng hơn
        energy -= slot_scores[idx]['score'] * position_weight
    return energy


def _generate_reasons(details):
    """Tạo lý do tại sao slot được khuyến nghị."""
    reasons = []

    if details.get('distance', 0) >= 0.8:
        reasons.append('Khoảng cách gần')
    elif details.get('distance', 0) >= 0.5:
        reasons.append('Khoảng cách hợp lý')

    if details.get('occupancy', 0) >= 0.8:
        reasons.append('Ít bệnh nhân trong khung giờ này')
    elif details.get('occupancy', 0) >= 0.5:
        reasons.append('Số bệnh nhân vừa phải')

    if details.get('time_preference', 0) >= 0.8:
        reasons.append('Phù hợp giờ mong muốn')

    if details.get('wait_time', 0) >= 0.8:
        reasons.append('Thời gian chờ ít')

    if not reasons:
        reasons.append('Khung giờ khả dụng')

    return reasons
