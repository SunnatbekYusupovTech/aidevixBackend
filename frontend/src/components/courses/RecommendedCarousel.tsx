'use client';

import React, { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import { Swiper as SwiperType } from 'swiper';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import CourseCard from '@components/courses/CourseCard';
import 'swiper/css';

type Course = {
  _id: string;
  [key: string]: unknown;
};

interface Props {
  courses: Course[];
}

export default function RecommendedCarousel({ courses }: Props) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  return (
    <div className="relative group/carousel w-full">
      {/* Custom Left Arrow */}
      {!isBeginning && (
        <button
          onClick={() => swiperRef.current?.slidePrev()}
          className="absolute left-[-22px] top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-11 h-11 rounded-full border border-primary-500/20 bg-[#0A0E1A]/75 backdrop-blur-md text-white/80 hover:text-white hover:border-primary-400 hover:bg-primary-500/25 shadow-[0_0_20px_rgba(0,0,0,0.6)] transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 scale-90 group-hover/carousel:scale-100 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label="Previous slide"
        >
          <IoChevronBack className="text-xl" />
        </button>
      )}

      {/* Custom Right Arrow */}
      {!isEnd && (
        <button
          onClick={() => swiperRef.current?.slideNext()}
          className="absolute right-[-22px] top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-11 h-11 rounded-full border border-primary-500/20 bg-[#0A0E1A]/75 backdrop-blur-md text-white/80 hover:text-white hover:border-primary-400 hover:bg-primary-500/25 shadow-[0_0_20px_rgba(0,0,0,0.6)] transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 scale-90 group-hover/carousel:scale-100 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label="Next slide"
        >
          <IoChevronForward className="text-xl" />
        </button>
      )}

      {/* Fade Gradients at Edges for Elegant Smooth Transitions */}
      <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-slate-950/40 to-transparent pointer-events-none z-10 hidden md:block" />
      <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-950/40 to-transparent pointer-events-none z-10 hidden md:block" />

      <Swiper
        onBeforeInit={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={(swiper) => {
          setIsBeginning(swiper.isBeginning);
          setIsEnd(swiper.isEnd);
        }}
        onSwiper={(swiper) => {
          setIsBeginning(swiper.isBeginning);
          setIsEnd(swiper.isEnd);
        }}
        modules={[Navigation, Autoplay]}
        slidesPerView={1.2}
        spaceBetween={12}
        grabCursor={true}
        autoplay={{
          delay: 6000,
          disableOnInteraction: true,
          pauseOnMouseEnter: true,
        }}
        breakpoints={{
          480: { slidesPerView: 1.5, spaceBetween: 12 },
          768: { slidesPerView: 2.2, spaceBetween: 16 },
          1024: { slidesPerView: 3, spaceBetween: 20 },
        }}
        className="w-full !py-4"
      >
        {courses.map((c, i) => (
          <SwiperSlide key={c._id} className="transition-transform duration-500 hover:scale-[1.015]">
            <CourseCard course={c} index={i} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
