package com.satadru.mobile.repository;

import com.satadru.mobile.model.Tourist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TouristRepository extends JpaRepository<Tourist, Long> {
    Optional<Tourist> findByUsername(String username);
    Optional<Tourist> findByUsernameAndPassword(String username, String password);
}
