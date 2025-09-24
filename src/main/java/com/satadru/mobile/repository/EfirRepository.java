package com.satadru.mobile.repository;

import com.satadru.mobile.model.Efir;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EfirRepository extends JpaRepository<Efir, Long> {
    List<Efir> findBySenderUsername(String username);
}
